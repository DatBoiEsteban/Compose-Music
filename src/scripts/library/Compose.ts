import { Channel } from './Channel';
import {
  BITS,
  LATTER_RATE,
  LETTER_ORDER,
  S2_MULTIPLIER,
  SEGMENT_SIZE
} from './consts';
import { getFit } from './Fitness';
import { bitsCross } from './Genetic';
import { Individual } from './Individual';
import { InfoTable } from './InfoTable';
import { SongSegment } from './SongSegment';
import { analizeSegments, placeMultipleSegments } from './Utilities';
import { createFile } from './wavManagment';

export function getSegments(pSong: Channel): SongSegment[] {
  const segments: SongSegment[] = [];

  for (let i = 0; i < pSong.getInfo().length; i += SEGMENT_SIZE) {
    const segmentData: any[] = [];
    const rand = Math.round(Math.random() * (pSong.getAll().length - SEGMENT_SIZE));

    for (let e = 0; e < SEGMENT_SIZE; e += 1) {
      segmentData.push(pSong.getAll()[rand + e]);
    }
    const segment: SongSegment = new SongSegment(segmentData);
    segment.analizeSegment();
    // this.bitsValue[i] = Math.round(this.CountFound[i] / 100 * Math.pow(2, BITS));
    segments.push(segment);
  }
  return segments;
}

export function getGoal(pSong: Channel): SongSegment[] {
  const segments: SongSegment[] = [];
  for (let i = 0; i < pSong.getInfo().length; i += SEGMENT_SIZE) {
    const segmentData: any[] = [];
    for (let e = 0; e < SEGMENT_SIZE && (i + e) < pSong.getInfo().length; e += 1) {
      segmentData.push(pSong.getAll()[i + e]);
    }
    const segment: SongSegment = new SongSegment(segmentData);
    segment.analizeSegment();
    segments.push(segment);
  }
  return segments;
}

export function cross(pFitSongs: Individual[][]): Individual[][] {
  const sons: Individual[][] = [[], []];
  for (let channel = 0; channel < 2; channel += 1) {
    for (let indi = 0; indi < pFitSongs[channel].length * 2; indi += 1) {
      const pos1 = Math.round(Math.random() * (pFitSongs[channel].length - 1));
      const pos2 = Math.round(Math.random() * (pFitSongs[channel].length - 1));
      const bitsValue = pFitSongs[channel][pos1].getBitsValues();
      const bits2 = pFitSongs[channel][pos2].getBitsValues();
      const newBits: number[] = [];
      for (let bit = 0; bit < bitsValue.length; bit += 1) {
        newBits.push(bitsCross(bitsValue[bit], bits2[bit]));
      }
      sons[channel].push(new Individual(newBits));
    }
  }
  return sons;
}

function individualsToSegments(pSons: Individual[][], pChannel: Channel[]) {
  const segments: SongSegment[][] = [[], []];
  for (let channel = 0; channel < segments.length; channel += 1) {
    for (const son of pSons[channel]) {
      const bits = son.getBitsValues();
      const tempLetters = [];
      for (let bit = 0; bit < bits.length; bit += 1) {
        let amount = bits[bit] / Math.pow(2, BITS) * SEGMENT_SIZE;
        while (amount > 0) {
          const letters = pChannel[channel].getLetter(LETTER_ORDER[bit]);
          const newLetter = letters[Math.round((letters.length - 1) * Math.random())];
          tempLetters.push(newLetter);
          amount -= 1;
        }
      }
      const segment = new SongSegment(tempLetters);
      segment.analizeSegment();
      segments[channel].push(segment);
    }
  }
  return segments;
}

function checkIfFound(pMissing: Individual[][], pGeneration: Individual[][],
                      pTable: InfoTable[][], pSegment: SongSegment[][]): Individual[][] {
  for (let channel = 0; channel < pMissing.length; channel += 1) {
    for (let i = 0; i < pMissing[channel].length; i += 1) {
      for (const point of pGeneration[channel]) {
        if (point.getBitsValues().toString() === pMissing[channel][i].getBitsValues().toString()) {
          placeMultipleSegments(pTable[channel], pSegment[channel][i]);
          pMissing[channel].splice(i, 1);
        }
      }
    }
  }
  return pMissing;
}

export function generateIndividuals(pSegments: SongSegment[]): Individual[] {
  const missing: Individual[] = [];
  for (const segment of pSegments) {
    const bits: number[] = [];
    const percentages = segment.getPercentages();
    for (let percentage = 0; percentage < percentages.length; percentage += 1) {
      bits[percentage] = Math.round(percentages[percentage] / 100 * Math.pow(2, BITS));
    }
    missing.push(new Individual(bits));
  }
  return missing;
}

export function compose(pMissing: SongSegment[][], pGen: SongSegment[][],
                        pChannel: Channel[], pTable: InfoTable[][]) {
  let gen = pGen;
  let num: number = 0;
  let missingIndividuals: Individual[][] = [
    generateIndividuals(pMissing[0]),
    generateIndividuals(pMissing[1])
  ];
  do {
    const genIndividuals: Individual[][] = [
      generateIndividuals(gen[0]),
      generateIndividuals(gen[1])
    ];
    const fitIndividuals = getFit(genIndividuals, missingIndividuals);
    const newGenIndividuals = cross(fitIndividuals);
    gen = individualsToSegments(newGenIndividuals, pChannel);
    if (num > 5) {
      missingIndividuals = checkIfFound(missingIndividuals, newGenIndividuals, pTable, gen);
      num = 0;
      analizeSegments(gen, pTable);
    }
    num += 1;
    console.log(missingIndividuals[0].length, missingIndividuals[1].length);
  } while (missingIndividuals[0].length !== 1 || missingIndividuals[1].length !== 1);
  const song: SongSegment[][] = [[], []];

  for (let channel = 0; channel < pMissing.length; channel += 1) {
    for (const missing of pMissing[channel]) {
      song[channel].push(pTable[channel][0]
                            .getFromPercentage(missing.getPercentages()));
    }
  }
  return song;
}

export function createWav(pSong: SongSegment[][], pAudioData: any, pLength: number) {
  console.log('Writing File');
  const newAudioData: Float32Array[] = [new Float32Array(pLength), new Float32Array(pLength)];
  const indices = [0, 0];
  for (let channel = 0; channel < pSong.length; channel += 1) {
    for (const segment of pSong[channel]) {
      const letters = segment.getLetters();
      for (const letter of letters) {
        const indexEnd = letter.index * LATTER_RATE + LATTER_RATE;
        for (let i = 0; i < S2_MULTIPLIER; i += 1) {
          for (let index = letter.index * LATTER_RATE; index < indexEnd; index += 1) {
            newAudioData[channel][indices[channel]] = pAudioData.channelData[channel][index];
            indices[channel] += 1;
          }
        }
      }
    }
  }
  createFile(newAudioData[0], newAudioData[1], '$cmp.wav');
}
