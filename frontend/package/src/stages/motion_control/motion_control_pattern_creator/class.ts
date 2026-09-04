import { MotionControlActions, PatternSettings } from '../../../shared';
import { InvalidMotionControlPatternError } from './errors';

const motionControlActions = Object.values(MotionControlActions);

export default class MotionControlPatternCreator {
    private _currentPattern?: MotionControlActions[];
    private _settings: PatternSettings;
    private _usedPattern: MotionControlActions[][];
    private _uniqueSpecifiedPatternList: MotionControlActions[][];

    constructor(settings: PatternSettings) {
        this._settings = settings;
        this._currentPattern = undefined;
        this._usedPattern = [];

        this._validatePattenLengthSetting();
        this._validateMotionControlCommandOptions();
        this._validateSpecifiedPatternsList();

        const set = new Set<string>();
        this._settings.specifiedPatternList.forEach((pattern) => set.add(pattern.join(',')));
        this._uniqueSpecifiedPatternList = Array.from(set).map(
            (patternString) => patternString.split(',') as MotionControlActions[]
        );
    }

    get currentPattern() {
        return this._currentPattern;
    }

    public throwErrorIfPatternNotExist() {
        if (!this._isPatternExist()) throw new InvalidMotionControlPatternError();
    }

    private _isPatternExist() {
        return !!this._currentPattern && this._currentPattern.length > 0;
    }

    public createPattern() {
        while (true) {
            const newPattern = this._settings.autoGeneration
                ? this._generateMotionControlPattern()
                : this._chooseRandomMotionControlPatternFromSettings();

            if (this._settings.autoGeneration) {
                this._currentPattern = newPattern;
                this._usedPattern.push(newPattern);
                break;
            } else {
                if (!this._isPatternAlreadyUsed(newPattern)) {
                    this._currentPattern = newPattern;
                    this._usedPattern.push(newPattern);
                    break;
                } else if (this._usedPattern.length === this._uniqueSpecifiedPatternList.length) {
                    this._usedPattern = [];
                    this._currentPattern = newPattern;
                    this._usedPattern.push(newPattern);
                    break;
                }
            }
        }
    }

    private _isPatternAlreadyUsed(pattern: MotionControlActions[]) {
        return this._usedPattern.some((usedPattern) => usedPattern.join() === pattern.join());
    }

    private _generateMotionControlPattern() {
        const { autoGenerationPatternLength: patternLength, autoGenerationPatternActionsList: options } =
            this._settings;

        const pattern = [];

        for (let i = 0; i < patternLength; i++) {
            const randomIndex = Math.floor(Math.random() * options.length);
            pattern.push(options[randomIndex]);
        }

        return pattern;
    }

    private _chooseRandomMotionControlPatternFromSettings() {
        const randomIndex = Math.floor(Math.random() * this._uniqueSpecifiedPatternList.length);
        return this._uniqueSpecifiedPatternList[randomIndex];
    }

    private _validatePattenLengthSetting() {
        const { autoGenerationPatternLength: patternLength } = this._settings;
        if (!Number.isInteger(patternLength)) throw new Error('Pattern length must be integer value');
        if (patternLength < 1) throw new Error('Pattern length must be equal or more than 1');
        if (patternLength > 5) throw new Error('Pattern length must be equal or less than 5');
    }

    private _validateMotionControlCommandOptions() {
        const { autoGenerationPatternActionsList: options } = this._settings;
        if (!Array.isArray(options)) throw new Error('Pattern options must be strings array');
        if (options.some((option: unknown) => typeof option !== 'string'))
            throw new Error('Pattern options must be strings array');
        if (options.some((option: string) => !this._isMotionControlAction(option)))
            throw new Error('Pattern options contains unknown action');
        if (new Set(options).size !== options.length)
            throw new Error('Pattern options must be contain only unique commands');
    }

    private _validateSpecifiedPatternsList() {
        const { specifiedPatternList: specifiedPatterns } = this._settings;
        if (!Array.isArray(specifiedPatterns))
            throw new Error('Specified patterns must be Motion Control patterns array');
        if (specifiedPatterns.length === 0)
            throw new Error('Specified patterns does not contain Motion Control patterns');
        if (specifiedPatterns.some((pattern) => !Array.isArray(pattern)))
            throw new Error("Specified patterns contains values which isn't Motion Control pattern array");
        if (specifiedPatterns.some((pattern) => pattern.some((command) => !this._isMotionControlAction(command))))
            throw new Error('Specified patterns contains pattern with unknown action');
    }

    private _isMotionControlAction(value: string) {
        return motionControlActions.includes(value as MotionControlActions);
    }

    destroy() {
        this._currentPattern = undefined;
        this._uniqueSpecifiedPatternList = [];
    }
}
