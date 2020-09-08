package ru.flint

import cats.effect._
import cats.implicits._

import higherkindness.droste.{scheme, Algebra}
import higherkindness.droste.syntax.all._
import higherkindness.droste.data.Fix

import ru.flint.js._
import ru.flint.js.Expr, Expr._

import scala.util.Try

import org.parboiled2._

import fs2.Stream
import fs2.io.file

import java.util.concurrent.{Executors, ThreadFactory}
import scala.concurrent.ExecutionContext
import java.util.concurrent.atomic.AtomicInteger
import java.nio.file.{Path, Paths}

final case class NamedDaemonThreadFactory(name: String) extends ThreadFactory {
  val threadNo = new AtomicInteger(0)
  val backingThreadFactory = Executors.defaultThreadFactory()

  def newThread(r: java.lang.Runnable) = {
    val thread = backingThreadFactory.newThread(r)
    thread.setName(name + "-" + threadNo.incrementAndGet().toString)
    thread.setDaemon(true)
    thread
  }
}

import Syntax._
import FlintParser._

object Main extends IOApp {
  def blocker(name: String): Blocker =
    Blocker.liftExecutionContext {
      ExecutionContext.fromExecutor(Executors.newCachedThreadPool(NamedDaemonThreadFactory(name)))
    }

  def parseFileContent(p: String) = {
    val parser = new LibraryParser(p)
    parser.MainP.run().toEither.leftMap {
      case x: ParseError => parser.formatError(x)
      case e => e.getMessage
    }
  }

  def run(args: List[String]): IO[ExitCode] = {
    val parser = new LibraryParser("{< :foo [ 1 2 3 ] :bar [ 2 3 4 ] >}")
    val result = parser.SyntaxP.run().toEither.leftMap {
      case x: ParseError => parser.formatError(x)
      case e => e.getMessage
    }

    val readBlocker = blocker("file-reader")

    val exampleContent: Resource[IO, String] =
      file.readAll[IO](Paths.get("examples", "one.flint").toAbsolutePath, readBlocker, 1024).compile.resource.toVector.map { (x: Vector[Byte]) =>
        new String(x.toArray, "UTF-8")
      }

    def getChildrenFiles(p: Path) =
      file.walk[IO](readBlocker, p.toAbsolutePath).flatMap { (x: Path) =>
        Stream.eval(IO(x.toFile.isFile)).flatMap { (isFile: Boolean) =>
          if (isFile) Stream.emit(x) else Stream.empty
        }
      }

    def fileContent(p: Path): Resource[IO, String] =
      file.readAll[IO](Paths.get("examples", "one.flint").toAbsolutePath, readBlocker, 1024)
        .compile.resource.toVector.map { (x: Vector[Byte]) =>
          new String(x.toArray, "UTF-8")
      }

    def exampleContents: IO[Map[Path, Either[String, LibEntry]]] =
      getChildrenFiles(Paths.get("examples")).parEvalMap(Int.MaxValue)({ (x: Path) => fileContent(x) use { (c: String) =>
        IO((x, parseFileContent(c)))
      }}).compile.to(Map)

    for {
      c <- exampleContents
      _ <- IO(println(s"results ::: $c"))
    } yield ExitCode.Success
  }
}
