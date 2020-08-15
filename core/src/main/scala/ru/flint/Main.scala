package ru.flint

import cats.effect._
import cats.implicits._

object Main extends IOApp {
  def run(args: List[String]): IO[ExitCode] = {
    IO(println("Hi!")) as ExitCode.Success
  }
}
