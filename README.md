# tera-data

This repository is intended to house packet and system message information for
TERA. It is intended to be platform agnostic, with details on the file formats
explained below.

The currently known open source parsers are:
- JavaScript (Node): [tera-data-parser](https://github.com/meishuu/tera-data-parser-js)

## Mappings

The `map` directory contains files which map unique identifiers (names) to their
numeric values. Currently, this includes:

- `protocol.map`, which links opcodes to "packet" names
- `sysmsg.map`, which links system message IDs to readable names

These generally come from the client binary and should not be built or modified
by hand unless you know what you're doing.

Methods and instructions on dumping opcodes and sysmsgs can be found from:
- [Meishu](https://github.com/meishuu/TeraScanners)
- [Mir](https://github.com/Mirrawrs/Tera/tree/master/GameClientAnalyzer)
- [Gl0](https://github.com/neowutran/TeraDpsMeterData/blob/master/copypaste-tuto/Gl0-opcodes.txt)
- [GoneUp](https://github.com/GoneUp/Tera_PacketViewer/tree/master/Opcode%20DLL#readme)

## Protocol

TERA's network data follows a custom protocol. It is convenient to describe the
order and meaning of each element in a "packet", which is done through a `.def`
file under the `protocol` directory, and named after the opcode it belongs to.

Each line in the `.def` must consist of the following, in order:
- An optional series of `-` for array and object definitions. These may be
  separated by spaces. To nest arrays or objects, just add another `-` to the
  front.
- A field type. Valid types listed below.
- At least one space.
- The name of the field.

A `#` and anything after it on the line are treated as comments and will be
ignored when parsing.

The formal grammar for this syntax is in the appendix at the end of this
document.

The following simple field types are supported:
- `bool`: A single byte that equals `true` for any non-zero value (and
  optionally warns for any value above 1).
- `byte`
- `float`: A four-byte floating-point number.
- `int16`
- `int32`
- `int64`
- `uint16`
- `uint32`
- `uint64`

There is one type that is not directly represented by the raw data and instead
serves organizational purposes:
- `object`: Any fields under this one should be collected into some sort of
  encapsulating object. For instance, x/y/z vectors can be under an `object`
  called "location".

There are also a few variable-length fields:
- `array`: Almost like `object`, except there can be 0 or more that should be
  collected into an array.
- `bytes`: A series of `byte` data.
- `string`: String data, encoded as null-terminated UTF-16LE (in other words, a
  series of `uint16` where the final value is 0).

Each of the variable-length fields has accompanying metadata. These fields are
determined implicitly (see the section below for the generation rules), but in
some cases, particularly with legacy definitions, the following metatypes can
be used. **These types are deprecated, and use of them will disable implicit
handling of these types:**
- `count`: Acts as `uint16`. Dictates the length of an `array` or `bytes` field
  of the same name.
- `offset`: Acts as `uint16`. Indicates the byte offset from the beginning of
  the message for an `array`, `bytes`, or `string` field of the same name.

More details on the original message format are below, while details on your
language's or library's implementation of these types should be described in
your library's documentation.

### Message Format

TERA's networking encodes all data in little-endian.

There are a few fields which are implied because they are never omitted. Every
packet begins with two fields:
- `uint16 length`, which describes the byte length of the message, including
  this header.
- `uint16 opcode`, which describes which kind of message this is. By looking up
  which name has this number in the mapping, you will know what the message is
  called.

Following these two fields are the metatypes for all variable length fields. To
produce the list, iterate through all variable length fields in order, and
depending on the type, add a `count` and/or `offset` field for it:
- `array`: Add `count` then `offset`.
- `bytes`: Add `offset` then `count`.
- `string`: Add `offset` only.

Additionally, all array elements begin with two fields:
- `offset here`, which can be used to verify correctness. If this is the first
  element, the `offset` for the array should match this; otherwise, it should
  match the `next` for the previous element.
- `offset next`, which points to the byte offset of the next element in the
  array, or zero if this is the final element.

In general, you will find `count` and `offset` fields at the beginning of a
message or array definition, and their corresponding fields at the end.

#### Example

Given the definition:

    int32 number
    array list
    - int16 value

A message will be parsed as if it were:

    uint16 (length)
    uint16 (opcode)
    count  list
    offset list
    int32  number
    array  list
    - offset (here)
    - offset (next)
    - int16  value

## Versioning

Protocol definitions contain version information in the filename:
`<NAME>.<VERSION>.def` where `<NAME>` is an opcode name and `<VERSION>` is an
integer starting from 1 and incrementing with each change.

**When submitting changes, contributors _must_ leave older versions untouched
unless they are trivially backwards compatible. Instead, submit the changed
definition as a new file with the version number incremented.**

Whenever TERA receives a major patch, a tag will be added to the repository,
and then the mappings will be updated and all outdated definition files will be
deleted.

## Contributing

Feel free to submit pull requests! Please read the above notice in bold.

## Appendix

### Formal Grammar

```ebnf
# Assume comments are removed (find the first "#" token and remove everything until the end of the line).
# Assume all lines have leading and trailing whitespace removed.

definition = { line };
line = [field] ["\r"] "\n";

whitespace = " " | "\t";
letter = "a".."z" | "A".."Z" | "_";
digit = "0".."9";
identifier = letter { letter | digit };

simple_type = "bool"
            | "byte"
            | "float"
            | ["u"] "int" ("16" | "32" | "64");

complex_type = "array"
             | "bytes"
             | "object"
             | "string";

meta_type = "count"
          | "offset";

type = simple_type | complex_type | meta_type;

depth = { "-" { whitespace } };
field = depth type whitespace { whitespace } identifier;
```
