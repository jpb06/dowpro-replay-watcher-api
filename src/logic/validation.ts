﻿import { Types } from 'dowpro-replay-watcher-dal';
import { MapData } from "relic-chunky-parser/typings/types/parsing.types";

export function AreResultsMatching(
    jsonResult: Types.GameResult,
    relicChunkyResult: MapData
): boolean {

    if (jsonResult.ModName !== relicChunkyResult.modName)
        return false;

    let relicChunkyPlayers = relicChunkyResult.players.filter(el => el.race.length !== 0);

    if (jsonResult.PlayersCount !== relicChunkyPlayers.length)
        return false;

    for (let i = 0; i < jsonResult.Players.length; i++) {

        if (relicChunkyPlayers.find(el => el.name === jsonResult.Players[0].Name) === undefined)
            return false;
    }

    let internalName = relicChunkyResult.internalName.substr(relicChunkyResult.internalName.lastIndexOf('\\') + 1);
    if (internalName !== jsonResult.MapName)
        return false;

    // not sure about this; some games durations are rounded, others floored
    if (Math.round(relicChunkyResult.duration) !== jsonResult.Duration
        && Math.floor(relicChunkyResult.duration) !== jsonResult.Duration)
        return false;

    return true;
}