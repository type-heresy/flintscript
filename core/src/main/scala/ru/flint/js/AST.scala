package ru.flint.js

import cats._
import cats.implicits._
import higherkindness.droste.util.DefaultTraverse

sealed trait Expr[+A] extends Product with Serializable

object Expr {
  final case class Array[A](value: List[A]) extends Expr[A]
  final case class Object[A](value: Map[String, A]) extends Expr[A]
  final case class Identifier(name: String) extends Expr[Nothing]
  final case object This extends Expr[Nothing]

  sealed trait Literal extends Expr[Nothing]

  object Literal {
    final case class Bool(value: Boolean) extends Literal
    final case class Number(value: Double) extends Literal
    final case class Str(value: String) extends Literal
    final case object Null extends Literal
  }

  final case class Block[A](value: List[A]) extends Expr[A]
  final case class Fn[A](args: List[Identifier], body: A) extends Expr[A]
  final case class Return[A](value: A) extends Expr[A]
  final case class Var[A](identifier: Identifier) extends Expr[A]
  final case class Assignment[A](lhs: A, rhs: A) extends Expr[A]

  final case class Unary[A](op: String, expression: A) extends Expr[A]
  final case class Binary[A](op: String, lhs: A, rhs: A) extends Expr[A]
  final case class IfThenElse[A](test: A, ok: A, failed: A) extends Expr[A]
  final case class Ternary[A](test: A, ok: A, failed: A) extends Expr[A]
  final case class Parens[A](expression: A) extends Expr[A]
  final case class Throw[A](expression: A) extends Expr[A]
  final case class Apply[A](expression: A, args: List[A]) extends Expr[A]
  final case class New[A](expression: A, args: List[A]) extends Expr[A]
  final case class Field[A](expression: A, key: String) extends Expr[A]
  final case class Index[A](expression: A, key: A) extends Expr[A]

  final case class Comment(content: String) extends Expr[Nothing]

 implicit def traverse: Traverse[Expr] = new DefaultTraverse[Expr] {
    def traverse[G[_]: Applicative, A, B](fa: Expr[A])(f: A => G[B]): G[Expr[B]] = fa match {
      case Array(v) => v.traverse(f).map(Array(_))
      case Object(v) => v.toList.traverse(x => Traverse[(String, ?)].traverse(x)(f)).map(x => Object(x.toMap))
      case Identifier(s) => (Identifier(s): Expr[B]).pure[G]
      case This => (This: Expr[B]).pure[G]
      case Literal.Bool(b) => (Literal.Bool(b): Expr[B]).pure[G]
      case Literal.Number(n) => (Literal.Number(n): Expr[B]).pure[G]
      case Literal.Str(s) => (Literal.Str(s): Expr[B]).pure[G]
      case Literal.Null => (Literal.Null: Expr[B]).pure[G]
      case Block(v) => v.traverse(f).map(Block(_))
      case Fn(args, body) => f(body).map(Fn(args, _))
      case Return(v) => f(v).map(Return(_))
      case Var(v) => (Var(v): Expr[B]).pure[G]
      case Assignment(lhs, rhs) => (f(lhs), f(rhs)).mapN(Assignment(_, _))
      case Unary(op, expr) => f(expr).map(Unary(op, _))
      case Binary(op, lhs, rhs) => (f(lhs), f(rhs)).mapN(Binary(op, _, _))
      case IfThenElse(test, ok, failed) => (f(test), f(ok), f(failed)).mapN(IfThenElse(_, _, _))
      case Ternary(test, ok, failed) => (f(test), f(ok), f(failed)).mapN(Ternary(_, _, _))
      case Parens(expr) => f(expr).map(Parens(_))
      case Throw(expr) => f(expr).map(Throw(_))
      case Apply(expr, args) => (f(expr), args.traverse(f)).mapN(Apply(_, _))
      case New(expr, args) => (f(expr), args.traverse(f)).mapN(New(_, _))
      case Field(expr, key) => (f(expr)).map(Field(_, key))
      case Index(expr, key) => (f(expr), f(key)).mapN(Index(_, _))
      case Comment(str) => (Comment(str): Expr[B]).pure[G]
    }
  }
}
