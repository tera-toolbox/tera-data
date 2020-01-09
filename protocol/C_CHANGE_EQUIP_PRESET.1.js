/*
The definition is implemented in JS due to the uniquely interleaved nature of its array elements.
This allows us to properly serialize the packet, making it indistinguishable from ones sent by the game client.
A logically equivalent (but incorrectly ordered, and hence easily detectable as faked) def would be as follows:

uint64 gameId
array items
- uint32 slot
- uint64 dbid
- uint32 passivitySet
array crystals
- uint32 slot
- uint32 id
*/

module.exports = {
    reader(stream) {
        let result = {};

        const count_items = stream.uint16();
        const offset_items = stream.uint16();
        const count_crystals = stream.uint16();
        const offset_crystals = stream.uint16();
        result.gameId = stream.uint64();

        result.items = new Array(count_items);
        let offset_items_tmp = offset_items;
        let index_items = 0;
        while (offset_items_tmp && index_items < count_items) {
            // TODO: check offset
            stream.seek(offset_items_tmp + 2);
            offset_items_tmp = stream.uint16();

            result.items[index_items] = {};
            result.items[index_items].slot = stream.uint32();
            result.items[index_items].dbid = stream.uint64();
            result.items[index_items].passivitySet = stream.uint32();

            ++index_items;
        }

        result.crystals = new Array(count_crystals);
        let offset_crystals_tmp = offset_crystals;
        let index_crystals = 0;
        while (offset_crystals_tmp && index_crystals < count_crystals) {
            // TODO: check offset
            stream.seek(offset_crystals_tmp + 2);
            offset_crystals_tmp = stream.uint16();

            result.crystals[index_crystals] = {};
            result.crystals[index_crystals].slot = stream.uint32();
            result.crystals[index_crystals].id = stream.uint32();

            ++index_crystals;
        }

        return result;
    },
    writer(stream, data) {
        const items = data.items || [];
        const crystals = data.crystals || [];

        stream.uint16(items.length);
        const offset_items = stream.position;
        stream.uint16(0);
        stream.uint16(crystals.length);
        const offset_crystal = stream.position;
        stream.uint16(0);

        stream.uint64(data.gameId || 0n);

        let num_written_crystals = 0;
        let offset_items_prev = offset_items;
        let offset_crystal_prev = offset_crystal;
        items.forEach(item => {
            let offset_items_cur = stream.position;
            stream.seek(offset_items_prev);
            stream.uint16(offset_items_cur);
            stream.seek(offset_items_cur);
            stream.uint16(offset_items_cur);
            offset_items_prev = stream.position;
            stream.uint16(0);

            stream.uint32(item.slot);
            stream.uint64(item.dbid);
            stream.uint32(item.passivitySet);

            crystals.filter(crystal => crystal.slot === item.slot).forEach(crystal => {
                let offset_crystal_cur = stream.position;
                stream.seek(offset_crystal_prev);
                stream.uint16(offset_crystal_cur);
                stream.seek(offset_crystal_cur);
                stream.uint16(offset_crystal_cur);
                offset_crystal_prev = stream.position;
                stream.uint16(0);

                stream.uint32(crystal.slot);
                stream.uint32(crystal.id);

                ++num_written_crystals;
            });
        });

        if (num_written_crystals !== crystals.length)
            throw Exception('Invalid data (crystals in slot without item)!');
    },
    cloner(data) {
        return {
            gameId: data.gameId,
            items: data.items.map(item => Object.assign({}, item)),
            crystals: data.crystals.map(crystal => Object.assign({}, crystal))
        }
    }
};
