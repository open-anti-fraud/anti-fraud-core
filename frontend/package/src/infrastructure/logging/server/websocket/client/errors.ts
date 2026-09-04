export class InvalidConnectionParamsError extends Error {
    name = 'InvalidConnectionParamsError';
    message =
        'An error occurred while trying to establish a log transfer connection. Check integration id in client configuration and integration settings on server';
}

export class FailedConnectionAttemptError extends Error {
    name: 'FailedConnectionAttemptError';
    message =
        'An error occurred while trying to establish a log transfer connection. Check the configuration of the deployed server for the availability and operability of the logging service.';
}
