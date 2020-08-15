package ru.flint

sealed trait AST[+S] extends Product with Serializable

object AST {
  final case class Morphism[S](apply: S => S) extends AST[S]
  final case class Word(identifier: Identifier) extends AST[Nothing]
  final case class Citation[+S](words: List[AST[S]]) extends AST[S]
}
