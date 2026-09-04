import DescriptionStage, { Props as DescriptionStageProps } from './class';

export default function descriptionStageFactory(props: DescriptionStageProps) {
    return new DescriptionStage(props);
}
