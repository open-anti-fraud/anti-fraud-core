import Attempt, { Props as AttemptProps } from './class';

export default function attemptFactory(props: AttemptProps) {
    return new Attempt(props);
}
