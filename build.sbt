lazy val core = (project in file("core"))
  .settings(
    name := "flint",
    organization := "ru.flint",
    version := "0.0.1",
    scalaVersion := "2.13.1",
    addCompilerPlugin("org.typelevel" %% "kind-projector" % "0.11.0" cross CrossVersion.full),
    mainClass := Some("ru.flint.Main"),
    libraryDependencies ++= Seq(
      "org.typelevel" %% "cats-core" % "2.2.0-RC2",
      "org.typelevel" %% "cats-effect" % "2.2.0-RC3",
      "io.higherkindness" %% "droste-core" % "0.8.0"))
