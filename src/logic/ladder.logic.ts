import * as Dal from 'dowpro-replay-watcher-dal'
import { platform } from 'os';
import { GamePlayer, Member } from 'dowpro-replay-watcher-dal/typings/exports/types.export';

export async function setPlayersStats(
    player1: Dal.Types.GamePlayer,
    player2: Dal.Types.GamePlayer
): Promise<Array<Dal.Types.GamePlayer & Member>> {

    let member1 = await initializePlayerStats(player1);
    let member2 = await initializePlayerStats(player2);

    calculateEloRatings(member1, member2, player1.IsAmongWinners ? player1.Name : player2.Name);

    await Dal.Manipulation.MembersStore.set(member1);
    await Dal.Manipulation.MembersStore.set(member2);

    return [
        { ...member1, ...player1 },
        { ...member2, ...player2 }
    ];
}

async function initializePlayerStats(
    player: Dal.Types.GamePlayer
): Promise<Member> {

    let member = await Dal.Manipulation.MembersStore.getByName(player.Name);

    if (member) {
        // Member exists

        let currentRaceStats = member.RaceStats.find(el => el.Race === player.Race);
        if (!currentRaceStats) {
            member.RaceStats.push({
                Race: player.Race,
                Wins: player.IsAmongWinners ? 1 : 0,
                losses: player.IsAmongWinners ? 0 : 1
            });
        }
        else {
            if (player.IsAmongWinners) currentRaceStats.Wins++;
            else currentRaceStats.losses++;
        }

        member.FavoriteRace = member.RaceStats.reduce((prev, current) =>
            (prev.Wins + prev.losses > current.Wins + current.losses) ? prev : current).Race;

        if (player.IsAmongWinners) member.Wins++;
        else member.Losses++;

    } else {
        // Member doesn't exist; creating him
        member = {
            Name: player.Name,
            EloRating: 1000,
            FavoriteRace: player.Race,
            Wins: player.IsAmongWinners ? 1 : 0,
            Losses: player.IsAmongWinners ? 0 : 1,
            RaceStats: [
                {
                    Race: player.Race,
                    Wins: player.IsAmongWinners ? 1 : 0,
                    losses: !player.IsAmongWinners ? 1 : 0
                }
            ]
        };
    }

    return member;
}

export function calculateRatio(
    wins: number, losses: number
) : number {
    let ratio;
    if (wins === 0) {
        ratio = 0;
    } else if (losses === 0) {
        ratio = 100;
    } else {
        ratio = Math.round(((wins / (wins + losses)) * 100) * 100) / 100;
    }
    return ratio;
}

export function calculateEloRatings(
    player1: Member,
    player2: Member,
    winnerName: string
): void {

    let d = calculateD(player1.EloRating, player2.EloRating);
    let player1GainProbability = 1 / (1 + Math.pow(10, -d / 400));

    let w = (player1.Name === winnerName) ? 1 : 0;
    let k = setK(player1.EloRating);

    let points = Math.round(k * (w - player1GainProbability));

    console.log(`points : ${points}`);

    player1.EloRating += points;
    player2.EloRating -= points;
}

function setK(
    elorating : number
) : number {
    // Players below 2100: K-factor of 32 used
    // Players between 2100 and 2400: K-factor of 24 used
    // Players above 2400: K-factor of 16 used.

    let k;

    if (elorating < 2100) k = 32;
    else if (elorating >= 2100 && elorating < 2400) k = 24;
    else k = 16;

    return k;
}

function calculateD(
    eloRating1: number,
    eloRating2: number
) {
    // capping d at 400

    let d = eloRating1 - eloRating2;

    if (Math.abs(d) > 400) {
        return d > 0 ? 400 : -400;
    }

    return d;
}