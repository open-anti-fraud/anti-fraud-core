import HandleBestshotStage, { Props as HandleBestshotStageProps } from './class';

export default function handleBestshotStageFactory(props: HandleBestshotStageProps) {
    return new HandleBestshotStage(props);
}
