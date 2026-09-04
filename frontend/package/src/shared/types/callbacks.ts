import { MotionControlPatternResult } from './motion_control_settings';

export type CallbackSettingsBlock = {
    callbacks: {
        onMounted: onMountedCallback;
        onBack: onBackCallback;
        onError: onErrorCallback;
        onUpdate: onUpdateCallback;
        onIdentifyApplicantStatus: onIdentifyApplicantStatusCallback;
        onMotion: onMotionCallback;
        onStartValidation: onStartValidationCallback;
        onGetReferenceImages: onGetReferenceImagesCallback;
        onValidate: onValidateCallback;
    };
};

export type onMountedCallback = () => void;
export type onBackCallback = () => void;
export type onUpdateCallback = () => void;
export type onStartValidationCallback = () => void;

export type onErrorCallback = (message: string, code: string) => void;

export type onIdentifyApplicantStatusCallback = (applicant?: { applicantId: string; status: number }) => void;
export type onGetReferenceImagesCallback = (referenceImages: string) => void;
export type onMotionCallback = (
    type: 'left' | 'right' | 'up' | 'closer' | 'farther' | 'return',
    currentAttemptNumber: number,
    result?: boolean
) => void;

export type onValidateCallback = (data: ValidationResult) => void;

export type ValidationResult = {
    attemptsCount: number;
    attemptsLeft: number;
    status: number;
    validationStatus: {
        expired: boolean;
        faceIsValid: boolean;
        antiSpoofingIsValid: boolean;
        profileAlreadyExists: boolean;
        qualityIsValid: boolean;
        livenessReflectionIsValid: boolean;
        lrCrossMatchIsValid: boolean;
        mcCrossMatchIsValid: boolean;
        hasBeenBlackListed: boolean;
    };
    invalidDataErrors: {
        code: string;
        message: string;
        description: string;
    }[];
    validations: {
        liveness: ValidationsBlock;
        quality: ValidationsBlock;
        matching: ValidationsBlock;
        motionControl: {
            verdict: boolean | null;
            motionControlInfo: {
                pattern: string;
                result: boolean;
            }[];
        };
    };
    faceSuccess: boolean;
    hasRiskEvents: boolean;
    riskEvents: RiskEvents[];
    callBackUrl: string;
    applicantId: string;
    attemptId: number;
};

type RiskEvents = {
    created: string;
    riskNumber: number;
    riskName: string;
    isActive: boolean;
};

type ValidationsBlock = {
    verdict: boolean | null;
    details: InspectionDetails[];
};

type InspectionDetails = {
    name: string;
    verdict: boolean;
    score: number;
    additionalInfo: {
        [key: string]: unknown;
    };
};

export type LiteCallbackSettingsBlock = {
    callbacks: {
        onMounted: onMountedCallback;
        onError: onErrorCallback;
        onMotion: onMotionCallback;
        onStartValidation: onStartValidationCallback;
        onGetReferenceImages: onGetReferenceImagesCallback;
        onValidate: onLiteValidateCallback;
    };
};

export type onLiteValidateCallback = (data: LiteValidationResult) => void;

export type LiteValidationResult = BestshotMetrics &
    VerificationMetrics &
    MotionControlResult & {
        endeavorId: string;
        externalLink: string;
    };

export type BestshotMetrics = QualityMetrics & DeepfakeMetrics & LivenesMetrics;

export type QualityMetrics = {
    quality: {
        value: true;
        failed_checks: null;
    };
};

export type LivenesMetrics = {
    liveness: {
        confidence: 0.9810623526573181;
        value: 'real';
        attack_type: 'none';
        attack_type_scores: {
            none: 0.9810623526573181;
            replay: 0.003310354857680208;
            photo: 0.001961465681507496;
            regions: 0.011742192283748093;
            '2d_mask': 0.00006898633475445998;
            '3d_mask': 0.0018546481849916277;
        };
    };
};

export type DeepfakeMetrics = {
    deepfake: {
        confidence: 0.0013117194175720215;
    };
};

export type VerificationMetrics = {
    verification: VerificationScores;
};

export type VerificationScores =
    | undefined
    | {
          distance: 1411;
          fa_r: 0;
          fr_r: 0.8720297813415527;
          score: 0.9949288368225098;
      };

export type MotionControlResult = {
    motionControlResult: MotionControlPatternResult | undefined;
};
