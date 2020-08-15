package ru.flint

final case class Vocabular[K, V](
  children: Map[K, Vocabular[K, V]],
  words: Map[K, V])
