// Story entry point. Gameplay reads and writes the VARs below; knots are jumped to by name.
// Ink reference: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md

VAR cash = 0

-> END

=== intro ===
A phone rings in the booth across the street.
* [Answer it]
    "You're new in town. Good. Need a driver, no questions."
    -> END
* [Walk away]
    -> END
