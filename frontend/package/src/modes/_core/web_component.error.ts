import { WebComponentError } from '../../shared';

export class PrepareEnvironmentForBiometricInspectionTimeoutError extends WebComponentError {
    static readonly ERROR_NAME = 'PrepareEnvironmentForBiometricInspectionTimeoutError';
    public readonly code = '1150009';
}
