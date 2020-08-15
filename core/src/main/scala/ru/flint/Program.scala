package ru.flint

import scala.util.Either

import cats.effect._

import ru.flint.AST._

trait Program[S] {
  def entry: Identifier
  def content: Vocabular[String, Morphism[S]]
  def run: IO[Either[Error, Unit]]
  def compile[T]: IO[Either[Error, T]]
}
