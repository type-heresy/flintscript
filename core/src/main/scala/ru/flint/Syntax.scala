package ru.flint

import cats.effect._
import cats.implicits._

import higherkindness.droste.{scheme, Algebra}
import higherkindness.droste.syntax.all._
import higherkindness.droste.data.Fix

import ru.flint.js._
import ru.flint.js.Expr, Expr._

import scala.util.Try

sealed trait Error extends Product with Serializable

sealed trait Syntax extends Product with Serializable

object Syntax {
  // foo, 1, 12, "bar"
  trait Rune extends Syntax

  object Rune {
    // :foo
    final case class Quoted(value: String) extends Rune
    // foo
    final case class Applied(value: String) extends Rune
    // 12.12
    final case class Number(value: Double) extends Rune
    // 12
    final case class Integer(value: Int) extends Rune
    // "foo\"bar"
    final case class Str(value: String) extends Rune
    // true | false
    final case class Bool(value: Boolean) extends Rune
    // nil
    final case object Nil extends Rune
  }


  // [ foo 1 12 "bar" ]
  final case class Script(runes: List[Syntax]) extends Syntax
  // [< foo 1 12 "bar" >]
  final case class Spell(runes: List[Syntax]) extends Syntax
  // { foo: [ 1 ], bar: [ 12 "bar" ] }
  // or in lib
  // module: foo
  // use: [ foo bar ]
  // reference: { foo: [ bar ] bar: [ baz ] }
  // foo: [ 1 ]
  // bar: [ 12 "bar" ]
  final case class Book(scripts: Map[String, Script]) extends Syntax
  // {< foo [ 1 ], bar: [ 12 "bar" ] >}
  // or in lib
  // template: foo
  // use: [ foo bar ]
  // reference: { foo: [ bar ] bar: [ baz ] }
  // foo [ 1 ]
  // bar [ 12 "bar" ]
  final case class Template(book: Book) extends Syntax

  trait Comment extends Syntax {
    val value: String
  }
  object Comment {
    final case class Multiline(value: String) extends Comment
    final case class Singleline(value: String) extends Comment
  }
}

sealed trait Use extends Product with Serializable

object Use {
  final case class Link(value: String) extends Use
  final case class Reference(key: String, value: String) extends Use
}

trait LibEntry extends Product with Serializable

object LibEntry {
  final case class Shelf(name: String, scripts: Map[String, Syntax.Script], uses: List[Use]) extends LibEntry
  final case class Lectern(name: String, scripts: Map[String, Syntax.Script], uses: List[Use]) extends LibEntry
}


import Syntax._

object Compiler {
/*
  def safeRune(rune: Rune): String =
    rune.value

  def compileNote(note: Note): Ast = note match {
    case Book(ss, ls, rs) => Literal.Bool(false).embed
    case Template(b) => Literal.Null.embed
  }
  def checkCycles(lib: Library): Either[Error, Library] =
    lib.asRight

  def compileRune(book: Book, rune: Rune): Ast = {
    if (book.scripts.contains(rune)) {
      val stackId = Identifier("stack")
      val body =
        Fix(Return(
          Fix(Apply(
            Fix(Field(This.embed, safeRune(rune))),
            List(stackId.embed)
          ))
        ))
      Fix(Fn(List(stackId), body))
    } else {
      Literal.Str("not implemented").embed
    }
  }

  def compileScript(book: Book, script: Script): Ast = {
    val fns: List[Ast] = script.runes.map(compileRune(book, _))
    val ident = Identifier("stack")
    val applied = fns.foldLeft(ident.embed) { (acc, fn) =>
      Fix(Apply(fn, List(acc)))
    }
    Fix(Fn(List(ident), Fix(Return(applied))))
  }

  def compileBook(book: Book): Ast = {
    val pairs = book.scripts.toList.map { case (rune, script) =>
      val key = safeRune(rune)
      val func = compileScript(book, script)
      (key, func)
    }
    val map: Map[String, Ast] = Map(pairs:_*)
    Fix(Object(map))
  }

  def compileTemplate(template: Template): Ast = {
    val ident = Identifier("stack")
    def atIndex(ix: Int): Ast = Fix(Apply(Fix(Field(ident.embed, "get")), List(Literal.Number(ix.toDouble).embed)))
    val body: Fix[Expr] = Fix(Return(compileBook(template.book)))
    def mbArg(name: String): Option[Int] =
      if (!name.startsWith("_flint_at_")) None
      else {
        val stripped = name.stripPrefix("_flint_at_")
        Try(stripped.toInt).toOption
      }
    val rewriteArgs: Ast => Ast = scheme.cata[Expr, Ast, Ast](Algebra { (x: Expr[Ast]) => x match {
      case Identifier(name) => mbArg(name) match {
        case None => x.embed
        case Some(x) => atIndex(x)
      }
      case other => x.embed
    }})
    val fn = Fix(Fn(List(ident), rewriteArgs(body)))
    fn
  }
 */
}
