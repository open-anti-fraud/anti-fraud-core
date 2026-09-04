import { ComponentMetaFromServer, ComponentSettingsFromClient, MergedConfiguration } from '../../application';
import { BaseModel } from '../../application/model';
import { Applicant, Attempt } from '../../domain';
import { FlowMode } from '../../shared';

export default class Model extends BaseModel {
    public mode: FlowMode;

    public clientSideConfiguration: ComponentSettingsFromClient;
    public serverSideConfiguration: ComponentMetaFromServer;
    public mergedConfiguration: MergedConfiguration;

    public applicant: Applicant | undefined;
    public fingerprint: object | undefined;
    public attempt: Attempt | undefined;

    constructor(flow: FlowMode, clientSideConfiguration: ComponentSettingsFromClient) {
        super();
        this.mode = flow;
        this.clientSideConfiguration = clientSideConfiguration;
    }

    async destroy() {
        await super.destroy();

        this.serverSideConfiguration = undefined!;
        this.mergedConfiguration = undefined!;

        this.applicant = undefined;
        this.fingerprint = undefined;
        this.attempt = undefined;
    }
}
