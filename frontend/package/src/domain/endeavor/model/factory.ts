import Endeavor, { Props as EndeavorProps } from './class';

export default function endeavorFactory(props: EndeavorProps) {
    return new Endeavor(props);
}
