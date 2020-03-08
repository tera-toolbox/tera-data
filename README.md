# tera-data

This repository is intended to house packet and system message information for
TERA. It is intended to be platform agnostic, with details on the file formats
explained below.

The currently known open source parsers are:
- JavaScript (Node): [tera-data-parser](https://github.com/tera-toolbox/tera-data-parser-js)

## Protocol

TERA's network data follows a custom protocol. It is convenient to describe the
order and meaning of each element in a "packet", which is done through a `.def`
file under the `definitions` directory, and named after the opcode it belongs to.

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
- `float`
- `double`
- `int16`
- `int32`
- `int64`
- `uint16`
- `uint32`
- `uint64`

The following complex field types are supported:
- `angle` - signed 16-bit integer angle automatically transformed to radians
- `vec3` - 3D vector used for location. See [tera-vec3](https://github.com/tera-toolbox/tera-vec3).
- `vec3fa` - Rotation Vec3 used for accessory transforms.
- `skillid` - An abstract representation of packed 64-bit skill IDs (patch >= 74). Contains the following properties and methods:
  - `npc` (Boolean) Indicates an NPC skill
  - `type` (Number) 1 = Action, 2 = Reaction (CC, pull, etc.)
  - `huntingZoneId` (Number) secondary key for type 1 NPC skills
  - `id` (Number) Skill ID
  - `reserved` (Number) Reserved bits, typically unused
  - `equals(skillId)`
  - `clone()`
  - `toString()`
- `skillid32` - same as `skillid`, but 32-bit version for patch <= 73
- `customize` - 64-bit basic character customization fields

There is one type that is not directly represented by the raw data and instead
serves organizational purposes:
- `object`: Any fields under this one should be collected into some sort of
  encapsulating object. For instance, location, angle, and character id for a
  targeted enemy can be under an `object` called "target".

There are also a few variable-length fields:
- `array`: Almost like `object`, except there can be 0 or more that should be
  collected into an array.
- `array<simple type>`, e.g. `array<int32>`: Array containing only a single field
  per entry.
- `bytes`: A series of `byte` data.
- `string`: String data, encoded as null-terminated UTF-16LE (in other words, a
  series of `uint16` where the final value is 0).

Each of the variable-length fields has accompanying metadata. This field is
determined implicitly if it is not specified (see the section below for the generation rules).
In some cases, for example when a packet contains both strings and arrays, the metadata
fields *must* be specified explicitly in order to properly serialize (write) the packet:
- `ref`: Indicates the metadata accompanying the field of the same name. Its actual behavior and
 representation in the serialized packet is determined implicitly based on the referenced
 field's data type:
  - for `array` and `array<>`: `uint16` count, `uint16` offset of first element
  - for `bytes`: `uint16` offset of bytes, `uint16` number of bytes
  - for `string`: `uint16` offset of string

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

Following these two fields are the metatypes for all variable length fields (`ref`).

Additionally, all array elements begin with two fields, which *must not* be specified
in the definition, as they are to be handled implicitly:
- `uint16 here`, which can be used to verify correctness. If this is the first
  element, the `offset` for the array should match this; otherwise, it should
  match the `next` for the previous element.
- `uint16 next`, which points to the byte offset of the next element in the
  array, or zero if this is the final element.

#### Example

Given the definition:

    int32 number
    array list
    - int16 value

A message will be parsed as if it were:

    uint16 (length)
    uint16 (opcode)
    ref    list # resolves to uint16 count, uint16 offset
    int32  number
    array  list
    - uint16 (here)
    - uint16 (next)
    - int16  value

## Versioning

Protocol definitions contain version information in the filename:
`<NAME>.<VERSION>.def` where `<NAME>` is an opcode name and `<VERSION>` is an
integer starting from 1 and incrementing with each change.

**When submitting changes, contributors _must_ leave older versions untouched
unless they are trivially backwards compatible. Instead, submit the changed
definition as a new file with the version number incremented.**

## Contributing

Feel free to submit pull requests! Please read the above notice in bold.
