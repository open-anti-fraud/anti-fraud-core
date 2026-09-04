import API from 'tdvc';

export type OpenAntiFraudApiProps = {
    baseUrl: string;
    integrationId?: string;
    platformToken?: string;
    authenticationToken?: string;
    videoRecorderToken?: string;
    accountId?: string;
    correlationId: string;
};

export default function openAntiFraudApiFactory(props: OpenAntiFraudApiProps) {
    return new API({
        baseUrl: props.baseUrl,
        integrationId: undefined,
        authenticationToken: undefined,
        videoRecorderToken: "token",
        accountId: props.accountId,
        correlationId: props.correlationId
    });
}
