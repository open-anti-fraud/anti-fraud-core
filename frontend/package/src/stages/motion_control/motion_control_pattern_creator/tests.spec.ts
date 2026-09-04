import { describe, expect, test } from '../../../../utils';
import { MotionControlActions } from '../../../shared';
import MotionControlPatternCreator from './class';

const actions = Object.values(MotionControlActions);

const errorCaseTests = [
    [
        'Throw error if passed decimal value as pattern length',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 1.5,
            specifiedPatternList: [],
        },
        'Pattern length must be integer value',
    ],
    [
        'Throw error if passed not number value as pattern length',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 'text',
            specifiedPatternList: [],
        },
        'Pattern length must be integer value',
    ],
    [
        'Throw error if passed 0 as pattern length',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 0,
            specifiedPatternList: [],
        },
        'Pattern length must be equal or more than 1',
    ],
    [
        'Throw error if passed negative values as pattern length',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: -1,
            specifiedPatternList: [],
        },
        'Pattern length must be equal or more than 1',
    ],
    [
        'Throw error if passed value more than 5 as pattern length',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 10,
            specifiedPatternList: [],
        },
        'Pattern length must be equal or less than 5',
    ],
    [
        'Throw error if passed not array value as pattern options',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: {},
            autoGenerationPatternLength: 1,
            specifiedPatternList: [],
        },
        'Pattern options must be strings array',
    ],
    [
        'Throw error if passed not string array value as pattern options',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: [1, 2, 3],
            autoGenerationPatternLength: 1,
            specifiedPatternList: [],
        },
        'Pattern options must be strings array',
    ],
    [
        'Throw error if passed unknow command in string array value as pattern options',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: ['a', 'b', 'c'],
            autoGenerationPatternLength: 1,
            specifiedPatternList: [],
        },
        'Pattern options contains unknown action',
    ],
    [
        'Throw error if passed dublicated command in string array value as pattern options',
        {
            autoGeneration: true,
            autoGenerationPatternActionsList: [MotionControlActions.LEFT, MotionControlActions.LEFT],
            autoGenerationPatternLength: 1,
            specifiedPatternList: [],
        },
        'Pattern options must be contain only unique commands',
    ],
    [
        'Throw error if passed invalid value as specified patterns array',
        {
            autoGeneration: false,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 1,
            specifiedPatternList: {},
        },
        'Specified patterns must be Motion Control patterns array',
    ],
    [
        'Throw error if passed empty array as specified patterns array',
        {
            autoGeneration: false,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 1,
            specifiedPatternList: [],
        },
        'Specified patterns does not contain Motion Control patterns',
    ],
    [
        'Throw error if passed array which contains values different from array as specified patterns array',
        {
            autoGeneration: false,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 1,
            specifiedPatternList: ['left'],
        },
        "Specified patterns contains values which isn't Motion Control pattern array",
    ],
    [
        'Throw error if passed array which contains values different from array as specified patterns array',
        {
            autoGeneration: false,
            autoGenerationPatternActionsList: actions,
            autoGenerationPatternLength: 1,
            specifiedPatternList: [actions, [1, 2, 3]],
        },
        'Specified patterns contains pattern with unknown action',
    ],
];

describe.only('Motion Control Pattern Test', () => {
    describe('Errors', () =>

        test.each(errorCaseTests)('%s', (testName, settings, expected) => {

            expect(() => new MotionControlPatternCreator(settings)).toThrowError(expected);
        }));

    describe('Generating', () => {
        test('Generate pattern which contains contains 3 actions and only "left" action pattern', () => {
            const patternLength = 3;
            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: true,
                autoGenerationPatternActionsList: [MotionControlActions.LEFT],
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: [[MotionControlActions.LEFT]],
            });

            motionControlPattern.createPattern();

            const pattern = motionControlPattern.currentPattern;
            expect(pattern).toHaveLength(patternLength);
            expect(pattern).toSatisfy((pattern: MotionControlActions[]) => pattern.every((item) => item === 'left'));
        });

        test('Generate random pattern which contains contains 5 random command', () => {
            const patternLength = actions.length;
            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: true,
                autoGenerationPatternActionsList: actions,
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: [[MotionControlActions.LEFT]],
            });

            motionControlPattern.createPattern();

            const pattern = motionControlPattern.currentPattern;
            expect(pattern).toHaveLength(patternLength);
            expect(pattern).toSatisfy((pattern: MotionControlActions[]) =>
                pattern.every((item) => actions.includes(item as MotionControlActions))
            );
        });

        test('Generate 20 random patterns which contains 5 random command and every pattern is unique', () => {
            const patterns = new Set<string>();

            const patternLength = actions.length;
            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: true,
                autoGenerationPatternActionsList: actions,
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: [[MotionControlActions.LEFT]],
            });

            for (let i = 0; i < 20; i++) {
                motionControlPattern.createPattern();
                const pattern = motionControlPattern.currentPattern;
                patterns.add(pattern!.join(','));
            }

            expect(patterns.size).toBe(20);
        });

        test('Generate 20 random patterns which contains only "Left" or "Right" command', () => {
            const patterns = [];
            const patternLength = actions.length;
            const commands = [MotionControlActions.LEFT, MotionControlActions.RIGHT];

            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: true,
                autoGenerationPatternActionsList: commands,
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: [[MotionControlActions.LEFT]],
            });

            for (let i = 0; i < 20; i++) {
                motionControlPattern.createPattern();
                const pattern = motionControlPattern.currentPattern;
                patterns.push(pattern);
            }

            expect(patterns).toHaveLength(20);
            expect(patterns).toSatisfy((patterns: string[][]) =>
                patterns.every((pattern) =>
                    pattern.every((action) => commands.includes(action as MotionControlActions))
                )
            );
        });
    });

    describe('Selecting', () => {
        test('Random choose 100 patterns from specified pattern list setting', () => {
            const patterns = [];
            const createPatternLength = 100;

            const patternLength = actions.length;
            const commands = [
                actions.slice(0, 1),
                actions.slice(0, 2),
                actions.slice(0, 3),
                actions.slice(0, 4),
                actions,
            ];

            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: false,
                autoGenerationPatternActionsList: actions,
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: commands,
            });

            for (let i = 0; i < createPatternLength; i++) {
                motionControlPattern.createPattern();
                const pattern = motionControlPattern.currentPattern;
                patterns.push(pattern);
            }

            expect(patterns).toHaveLength(createPatternLength);
        });

        test('Random choose 3 patterns from specified pattern list setting', () => {
            const patterns = [];
            const createPatternLength = 3;

            const patternLength = actions.length;
            const commands = [actions, actions.slice(1), actions];

            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: false,
                autoGenerationPatternActionsList: actions,
                autoGenerationPatternLength: patternLength,
                specifiedPatternList: commands,
            });

            for (let i = 0; i < createPatternLength; i++) {
                motionControlPattern.createPattern();
                const pattern = motionControlPattern.currentPattern;
                patterns.push(pattern);
            }

            expect(patterns).toHaveLength(createPatternLength);
            expect(patterns).toSatisfy((patterns: string[][]) =>
                patterns.every((pattern) => commands.some((option) => option.join() === pattern.join()))
            );
        });

        test('Get random pattern from pecified patterns array', () => {
            const specifiedPatternList = [actions, [...actions].reverse()];
            const motionControlPattern = new MotionControlPatternCreator({
                enableSaveFrames: false,
                autoGeneration: false,
                autoGenerationPatternActionsList: actions,
                autoGenerationPatternLength: 1,
                specifiedPatternList,
            });

            motionControlPattern.createPattern();
            const pattern = motionControlPattern.currentPattern;
            expect(pattern).toSatisfy((pattern) =>
                specifiedPatternList.some((option) => option.join() === pattern.join())
            );
        });
    });
});
