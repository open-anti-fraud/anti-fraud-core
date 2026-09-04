import TakeFaceBestshotsStage, { Props as TakeFaceBestshotsStageProps } from './class';

export default function takeFaceBestshotsStageFactory(props: TakeFaceBestshotsStageProps) {
    return new TakeFaceBestshotsStage(props);
}
