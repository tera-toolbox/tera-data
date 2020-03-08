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
    reader(buffer) {
        let buffer_pos = 0;
        let result = {};

        let count_items = buffer.getUint16(4, true);
        let offset_items = buffer.getUint16(6, true);
        let count_crystals = buffer.getUint16(8, true);
        let offset_crystals = buffer.getUint16(10, true);
        result.gameId = buffer.getBigUint64(12, true);
        result.items = new Array(count_items);

        let offset_items_tmp = offset_items;
        let index_items = 0;
        let item;
        while (offset_items_tmp && index_items < count_items) {
            // TODO: check offset
            buffer_pos = offset_items_tmp;
            offset_items_tmp = buffer.getUint16(buffer_pos + 2, true);
            item = {};
            item.slot = buffer.getUint32(buffer_pos + 4, true);
            item.dbid = buffer.getBigUint64(buffer_pos + 8, true);
            item.passivitySet = buffer.getUint32(buffer_pos + 16, true);
            result.items[index_items] = item;

            ++index_items;
        }

        result.crystals = new Array(count_crystals);
        let offset_crystals_tmp = offset_crystals;
        let index_crystals = 0;
        let crystal;
        while (offset_crystals_tmp && index_crystals < count_crystals) {
            // TODO: check offset
            buffer_pos = offset_crystals_tmp;
            offset_crystals_tmp = buffer.getUint16(buffer_pos + 2, true);
            crystal = {};
            crystal.slot = buffer.getUint32(buffer_pos + 4, true);
            crystal.id = buffer.getUint32(buffer_pos + 8, true);
            result.crystals[index_crystals] = crystal;

            ++index_crystals;
        }

        return result;
    },
    writer(buffer, data) {
        let buffer_pos = 0;
        buffer.setUint16(4, data.items ? data.items.length : 0, true);
        let offset_items = 6;
        buffer.setUint16(6, 0, true);
        buffer.setUint16(8, data.crystals ? data.crystals.length : 0, true);
        let offset_crystal = 10;
        buffer.setUint16(10, 0, true);
        buffer.setBigUint64(12, data.gameId ? BigInt(data.gameId) : 0n, true);
        buffer_pos += 20;

        let num_written_crystals = 0;
        let offset_items_prev = offset_items;
        let offset_crystal_prev = offset_crystal;
        items.forEach(item => {
            buffer.setUint16(offset_items_prev, buffer_pos, true);
            buffer.setUint16(buffer_pos, buffer_pos, true);
            offset_items_prev = buffer_pos + 2;
            buffer.setUint16(buffer_pos + 2, 0, true);
            buffer.setUint32(buffer_pos + 4, item.slot, true);
            buffer.setBigUint64(buffer_pos + 8, item.dbid ? BigInt(item.dbid) : 0n, true);
            buffer.setUint32(buffer_pos + 16, item.passivitySet, true);
            buffer_pos += 20;

            crystals.filter(crystal => crystal.slot === item.slot).forEach(crystal => {
                buffer.setUint16(offset_crystal_prev, buffer_pos, true);
                buffer.setUint16(buffer_pos, buffer_pos, true);
                offset_crystal_prev = buffer_pos + 2;
                buffer.setUint16(buffer_pos + 2, 0, true);
                buffer.setUint32(buffer_pos + 4, crystal.slot, true);
                buffer.setUint32(buffer_pos + 8, crystal.id, true);
                buffer_pos += 12;

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
        };
    }
};
