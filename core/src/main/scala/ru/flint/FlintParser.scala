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

class FlintParser(val input: ParserInput) extends Parser with StringBuilding {
  import CharPredicate.{Digit, Digit19, HexDigit}
  import FlintParser._

  def StrP: Rule1[Rune.Str] = rule(StrUnwrapped ~> ((x: String) => Rune.Str(x)))
  def StrUnwrapped = rule ('"' ~ clearSB() ~ Characters ~ '"' ~ push(sb.toString))
  def Characters = rule(zeroOrMore(Character | '\\' ~ EscapedChar))
  def Character = rule(!QuoteBackSlash ~ ANY ~ appendSB())
  def EscapedChar = rule (
    QuoteBackSlash ~ appendSB()
      | 'b' ~ appendSB('\b')
      | 'f' ~ appendSB('\f')
      | 'n' ~ appendSB('\n')
      | 'r' ~ appendSB('\r')
      | 't' ~ appendSB('\t')
      | Unicode ~> { code => sb.append(code.asInstanceOf[Char]); () }
  )

  def Unicode = rule('u' ~ capture(HexDigit ~ HexDigit ~ HexDigit ~ HexDigit) ~> (java.lang.Integer.parseInt(_, 16)))

  def NilP: Rule1[Rune.Nil.type] = rule("nil" ~ push(Rune.Nil))
  def TrueP: Rule1[Rune.Bool] = rule("true" ~ push(Rune.Bool(true)))
  def FalseP: Rule1[Rune.Bool] = rule("false" ~ push(Rune.Bool(false)))

  def IntP: Rule1[Rune.Integer] = rule(capture(Integer) ~> ((x: String) => Rune.Integer(x.toInt)))
  def NumP: Rule1[Rune.Number] = rule(capture(Num) ~> ((x: String) => Rune.Number(x.toDouble)))

  def Integer: Rule0 = rule(optional('-') ~ (Digit19 ~ Digits | Digit))
  def Digits: Rule0 = rule(oneOrMore(Digit))
  def Num: Rule0 = rule(Integer ~ '.' ~ Digits)

  def QuoteP: Rule1[Rune.Quoted] = rule(Quote ~> ((x: String) => Rune.Quoted(x)))
  def Quote: Rule1[String] = rule(':' ~ clearSB() ~ NonWS ~ push(sb.toString))
  def NonWS: Rule0 = rule(oneOrMore(NonWSC))
  def NonWSC: Rule0 = rule(!WS1 ~ ANY ~ appendSB())

  def AppliedP: Rule1[Rune.Applied] = rule(Applied ~> ((x: String) => Rune.Applied(x)))
  def Applied: Rule1[String] = rule(!Colon ~ clearSB() ~ NonWS ~ push(sb.toString))

  def RuneP: Rule1[Rune] =
    rule(NilP | TrueP | FalseP | StrP | NumP | IntP | QuoteP | AppliedP)

  def ScriptP: Rule1[Script] =
    rule('[' ~ WS1 ~ ScriptContents ~ ']' ~> ((x: Seq[Syntax]) => Script(List(x:_*))))

  def SpellP: Rule1[Spell] =
    rule("[<" ~ WS1 ~ ScriptContents ~ ">]" ~> ((x: Seq[Syntax]) => Spell(List(x:_*))))

  def ScriptContents: Rule1[Seq[Syntax]] = rule(zeroOrMore(ScriptContent))
  def ScriptContent: Rule1[Syntax] = rule(!Closing ~ SyntaxNoClosing ~ WS1)

  def WS1 = rule(oneOrMore(WhiteSpaceChar))
  def WS = rule(zeroOrMore(WhiteSpaceChar))

  def BookP: Rule1[Book] =
    rule('{' ~ WS1 ~ BookContents ~ '}' ~> ((x: Seq[(String, Script)]) => Book(Map(x:_*))))

  def BookContents: Rule1[Seq[(String, Script)]] =
    rule(zeroOrMore(BookContent))
  def BookContent: Rule1[(String, Script)] =
    rule(Quote ~ WS1 ~ ScriptP ~ WS1 ~> ((r: String, s: Script) => (r, s)))

  def TemplateP: Rule1[Template] =
    rule("{<" ~ WS1 ~ BookContents ~ ">}" ~> ((x: Seq[(String, Script)]) => Template(Book(Map(x:_*)))))

  def CommentP: Rule1[Comment] =
    rule(MultilineP | SinglelineP)

  def SinglelineP: Rule1[Comment.Singleline] =
    rule("//" ~ clearSB() ~ Singleline ~ NLs ~ push(sb.toString) ~> ((x: String) => Comment.Singleline(x)))
  def Singleline: Rule0 =
    rule(zeroOrMore(!NL ~ ANY ~ appendSB()))

  def MultilineP: Rule1[Comment.Multiline] =
    rule("/*" ~ clearSB() ~ Multiline ~ "*/" ~ push(sb.toString) ~> ((x: String) => Comment.Multiline(x)))
  def Multiline: Rule0 =
    rule(zeroOrMore(!"*/" ~ ANY ~ appendSB()))

  def SyntaxP: Rule1[Syntax] =
    rule(!ClosingP ~ SyntaxNoClosing)
  def SyntaxNoClosing: Rule1[Syntax] =
    rule(CommentP | TemplateP | BookP | SpellP | ScriptP | RuneP)

  def ClosingP =
    rule(WS1 ~ Closing)
  def Closing =
    rule(ClosingScript | ClosingSpell | ClosingBook | ClosingTemplate)
  def ClosingScript =
    rule(']')
  def ClosingSpell =
    rule(">]")
  def ClosingBook =
    rule('}')
  def ClosingTemplate =
    rule(">}")

  def NLs = rule(oneOrMore(NL))
}

object FlintParser {
  val QuoteBackSlash = CharPredicate("\"\\")
  val Colon = CharPredicate(":\"\\")
  val WhiteSpaceChar = CharPredicate(" \n\r\t\f")
  val NL = CharPredicate("\n\r")
}
