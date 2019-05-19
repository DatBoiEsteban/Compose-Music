import {Channel} from './library/Channel';
import {compose, generateIndividuals, getGoal, getSegments} from './library/Compose';
import {
  AMOUNT_OF_SONGS, BIT_RATE, BITS,
  LATTER_RATE, S2_MULTIPLIER
} from './library/consts';
import {Individual} from './library/Individual';
import {infoTable} from './library/infoTable';
import {getForm, getSector} from './library/sector';
import {SongSegment} from './library/SongSegment';
import {analizeSegments, analizeSong} from './library/Utilities';
import {readAudiodata} from './library/wavManagment';

const sectorsS1: Channel[] = [new Channel(), new Channel()];
const sectorsS2: Channel[] = [new Channel(), new Channel()];
const S1: string = process.argv[2];
const S2: string = process.argv[3];
const audioDataS1 = readAudiodata(S1);
const audioDataS2 = readAudiodata(S2);
const missingSegmentsS2: SongSegment[][] = [[], []];
const individuals: Individual[][] = [[], []];
const firstGen: SongSegment[][] = [[], []];
const objetive: Individual[][] = [[], []];

analizeSong(audioDataS1, sectorsS1);
analizeSong(audioDataS2, sectorsS2);

missingSegmentsS2[0] = getGoal(sectorsS2[0]);
missingSegmentsS2[1] = getGoal(sectorsS2[1]);

firstGen[0] = getSegments(sectorsS1[0]);
firstGen[1] = getSegments(sectorsS1[1]);

const infoTablesIndividual: infoTable[][] = [];

infoTablesIndividual.push(analizeSegments(firstGen[0]));
infoTablesIndividual.push(analizeSegments(firstGen[1]));
console.log(firstGen[0][0])
compose(missingSegmentsS2, firstGen, sectorsS1);
