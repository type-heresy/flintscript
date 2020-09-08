package ru.flint

import cats.effect._
import cats.implicits._

import higherkindness.droste.{scheme, Algebra}
import higherkindness.droste.syntax.all._
import higherkindness.droste.data.Fix

//import ru.flint.js._
//import ru.flint.js.Expr, Expr._

import org.parboiled2._

import scala.util.Try

import shapeless._

import Syntax._
import Use._
import LibEntry._

class LibraryParser(input: ParserInput) extends FlintParser(input) {
  def BookHeaderP: Rule1[String] =
    rule("book:" ~ WS1 ~ Applied ~ NLs)

  def TemplateHeaderP: Rule1[String] =
    rule("template:" ~ WS1 ~ Applied ~ NLs)

  def UsesP: Rule1[List[Use]] =
    rule(zeroOrMore(UseP) ~> ((x: Seq[Use]) => List(x:_*)))
  def UseP: Rule1[Use] =
    rule(LinkP | ReferenceP)
  def LinkP: Rule1[Link] =
    rule("link:" ~ WS1 ~ Applied ~ NLs ~> ((x: String) => Link(x)))
  def ReferenceP: Rule1[Reference] =
    rule("reference:" ~ WS1 ~ Applied ~ WS1 ~ Quote ~ NLs ~> ((a: String, b: String) => Reference(a, b)))

  def EntriesP: Rule1[Map[String, Script]] =
    rule(oneOrMore(EntryP).separatedBy(WS1) ~> ((x: Seq[(String, Script)]) => Map(x:_*)))
  def EntryP: Rule1[(String, Script)] =
    rule(Quote ~ WS1 ~ ScriptP ~> ((r: String, s: Script) => (r, s)))

  def ShelfP: Rule1[Shelf] =
    rule(BookHeaderP ~ UsesP ~ EntriesP ~> ((x: String, y: List[Use], z: Map[String, Script]) =>
      Shelf(x, z, y)
    ))

  def LecternP: Rule1[Lectern] =
    rule(TemplateHeaderP ~ UsesP ~ EntriesP ~> ((x: String, y: List[Use], z: Map[String, Script]) =>
      Lectern(x, z, y)
    ))

  def LibEntryP: Rule1[LibEntry] =
    rule(ShelfP | LecternP)

  def MainP: Rule1[LibEntry] =
    rule(LibEntryP ~ EOI)
}
