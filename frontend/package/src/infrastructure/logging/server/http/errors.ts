export class FailedSendingLogAttemptError extends Error {
    name: 'FailedSendingLogAttemptError';
    message =
        'An error occurred while trying to send a log. Check the configuration of the deployed server for the availability and operability of the logging service.';
}
