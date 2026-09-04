import { expect, test } from '../../../../../utils';
import { MergedConfiguration } from '../../../../application';
import { baseClientConfiguration, serverMeta, validConfiguration } from '../../../configuration_from_server/tests/mock';
import ConfigurationMerger from '../../class';

const validator = new ConfigurationMerger();

test('Disable applicantFields if applicantId exist', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                applicantId: '06e6515a-f077-466d-9ac3-74a2500ae7fc',
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        applicantId: '06e6515a-f077-466d-9ac3-74a2500ae7fc',
        applicantFields: {
            email: { enabled: false, primary: false },
            phone: { enabled: false, primary: false },
            firstName: { enabled: false, primary: false },
            lastName: { enabled: false, primary: false },
            referenceId: { enabled: false, primary: false },
        },
    });
});

test('Change enable for firstName field in applicantFields', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                applicantFields: {
                    firstName: { enabled: !serverMeta.settings.applicantFields.firstName.enabled },
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        applicantFields: {
            ...validConfiguration.applicantFields,
            firstName: {
                ...validConfiguration.applicantFields.firstName,
                enabled: !serverMeta.settings.applicantFields.firstName.enabled,
            },
        },
    });
});

test('Change primary field in applicantFields', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                applicantFields: {
                    firstName: { primary: !serverMeta.settings.applicantFields.firstName.primary },
                    email: {
                        primary: !serverMeta.settings.applicantFields.email.primary,
                    },
                },
            },
            serverSettings: {
                ...serverMeta.settings,
                applicantFields: {
                    ...serverMeta.settings.applicantFields,
                    firstName: {
                        ...serverMeta.settings.applicantFields.firstName,
                        enabled: !serverMeta.settings.applicantFields.firstName.enabled,
                    },
                },
            },
        })
    ).toEqual({
        ...validConfiguration,
        applicantFields: {
            ...validConfiguration.applicantFields,
            firstName: {
                enabled: !serverMeta.settings.applicantFields.firstName.enabled,
                primary: !serverMeta.settings.applicantFields.firstName.primary,
            },
            email: {
                ...validConfiguration.applicantFields.email,
                primary: !serverMeta.settings.applicantFields.email.primary,
            },
        },
    } as MergedConfiguration);
});

test('Disable email and enabled firstName applicantFields', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                applicantFields: {
                    firstName: { enabled: true, primary: true },
                    email: {
                        enabled: false,
                        primary: false,
                    },
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        applicantFields: {
            ...validConfiguration.applicantFields,
            firstName: { enabled: true, primary: true },
            email: { ...validConfiguration.applicantFields.email, enabled: false, primary: false },
        },
    });
});

test('Enabled all applicantFields', async () => {
    expect(
        validator.merge({
            clientSettings: {
                ...baseClientConfiguration,
                applicantFields: {
                    firstName: { enabled: true },
                    lastName: { enabled: true },
                    email: { enabled: true },
                    phone: { enabled: true },
                    referenceId: { enabled: true },
                },
            },
            serverSettings: serverMeta.settings,
        })
    ).toEqual({
        ...validConfiguration,
        applicantFields: {
            ...validConfiguration.applicantFields,
            firstName: { ...validConfiguration.applicantFields.firstName, enabled: true },
            lastName: { ...validConfiguration.applicantFields.lastName, enabled: true },
            email: { ...validConfiguration.applicantFields.email, enabled: true },
            phone: { ...validConfiguration.applicantFields.phone, enabled: true },
            referenceId: { ...validConfiguration.applicantFields.referenceId, enabled: true },
        },
    });
});
