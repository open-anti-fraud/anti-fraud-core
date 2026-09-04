import { BaseModel, LiteComponentSettingsFromClient, LiteMergedConfiguration } from '../../application';
import { VerificationScores } from '../../shared';

export default class Model extends BaseModel {
    public clientSideConfiguration: LiteComponentSettingsFromClient;
    public mergedConfiguration: LiteMergedConfiguration;
    public verificationResult: VerificationScores;

    constructor(clientSideConfiguration: LiteComponentSettingsFromClient) {
        super();
        this.clientSideConfiguration = clientSideConfiguration;
    }

    async destroy() {
        await super.destroy();
        this.mergedConfiguration = undefined!;
        this.verificationResult = undefined;
    }
}
