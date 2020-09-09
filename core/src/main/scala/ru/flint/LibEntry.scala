package ru.flint

import cats._
import cats.effect._
import cats.implicits._

import higherkindness.droste.{scheme, Algebra}
import higherkindness.droste.syntax.all._
import higherkindness.droste.data.Fix

import ru.flint.js._
import ru.flint.js.Expr, Expr._

sealed trait Use extends Product with Serializable {
  val value: String
}

object Use {
  final case class Link(value: String, names: List[String]) extends Use
  final case class Reference(key: String, value: String) extends Use
}

trait LibEntry extends Product with Serializable {
  val name: String
  val uses: List[Use]
  val scripts: Map[String, Syntax.Script]
}

object LibEntry {
  final case class Shelf(name: String, scripts: Map[String, Syntax.Script], uses: List[Use]) extends LibEntry
  final case class Lectern(name: String, scripts: Map[String, Syntax.Script], uses: List[Use]) extends LibEntry

  def prepareLibrary[F[_]: Foldable](entries: F[LibEntry]): Map[String, List[Use]] =
    entries.foldLeft(Map[String, List[Use]]()) { (acc: Map[String, List[Use]], entry: LibEntry) =>
      acc.updated(entry.name, entry.uses)
    }

  def checkEntryNames[F[_]: Foldable](entries: F[LibEntry]): Map[String, Int] = {
    val accumulated = entries.foldLeft(Map[String, Int]()) { (acc: Map[String, Int], entry: LibEntry) =>
      val currentVal = acc.get(entry.name).getOrElse(0)
      acc.updated(entry.name, currentVal + 1)
    }
    accumulated.filter { case (k: String, v: Int) =>
      v > 0
    }
  }

  def checkLinkNames(entry: LibEntry): Map[String, Int] = {
    val initial: Map[String, Int] = entry.scripts.toList.foldLeft(Map[String, Int]()) {
      (acc: Map[String, Int], inp: (String, Syntax.Script)) =>
        acc.updated(inp._1, 1)
    }
    entry.uses.foldLeft(initial) { (acc: Map[String, Int], use: Use) => use match {
      case Use.Reference(_, _) => acc
      case Use.Link(mod, names) =>
        names.foldLeft(acc) { (acc0: Map[String, Int], scriptLink: String) =>
          val used = acc0.get(scriptLink).getOrElse(0)
          acc.updated(scriptLink, used + 1)
        }
    }}
  }

  def checkCycles(entryPoint: String, library: Map[String, List[Use]]): Option[Set[String]] = {
    checkCycles0(Set(entryPoint), Set(), library)
  }

  // TODO: whole cycle path
  @scala.annotation.tailrec
  private def checkCycles0(entries: Set[String], accumulated: Set[String], library: Map[String, List[Use]]): Option[Set[String]] = {
    val uses: Set[String] = entries.foldLeft(Set[String]()) { (acc: Set[String], entry: String) =>
      val entryUses: List[Use] = library.get(entry).getOrElse(List())
      val entrySet: Set[String] = Set(entryUses:_*).map(_.value)
      acc ++ entrySet
    }

    if (uses.isEmpty) {
      None
    } else {
      val incorrect: Set[String] =
        uses.foldLeft(Set[String]()) { (acc: Set[String], used: String) =>
          if (accumulated.contains(used)) { acc + used } else { acc }
        }
      if (incorrect.isEmpty) {
        checkCycles0(uses, accumulated ++ entries, library)
      } else {
        Some(incorrect)
      }
    }
  }

  def modulesToCompile(entryPoint: String, library: Map[String, List[Use]]): Set[String] = {
    modulesToCompile0(Set(entryPoint), library)
  }

  @scala.annotation.tailrec
  def modulesToCompile0(acc: Set[String], library: Map[String, List[Use]]): Set[String] = {
    val appendee: Set[String] = acc.foldLeft(Set[String]()) { (acc: Set[String], entry: String) =>
      val entryUses: List[Use] = library.get(entry).getOrElse(List())
      val entrySet: Set[String] = Set(entryUses:_*).map(_.value)
      acc ++ entrySet
    }
    modulesToCompile0(appendee ++ acc)
  }
}
