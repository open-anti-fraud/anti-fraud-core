import type { LiteValidationResult } from '@tdvc/face-onboarding';
import type {
	DeepfakeMetrics,
	LivenesMetrics,
	MotionControlResult,
	QualityMetrics,
	VerificationMetrics,
} from '@tdvc/face-onboarding/dist/shared';
import './style.css';

type Props = {
	biometryResult: LiteValidationResult;
	originalPhoto: string | undefined;
	bestshot: string | undefined;
};

export default function BiometryStats({ biometryResult, originalPhoto, bestshot }: Props) {
	const { liveness, deepfake, quality, verification, motionControlResult } = biometryResult;

	console.log(biometryResult);

	return (
		<div className='biometry-stats'>
			<div className='stats-block'>
				<h3 className='stats-block__heading'>Binary content</h3>

				<div className='row biometry-images'>
					{originalPhoto && (
						<img
							className='biometry-image'
							src={originalPhoto}
							alt='Face original photo'
						></img>
					)}

					<img
						className='biometry-image'
						src={bestshot}
						alt='Face bestshot'
					></img>
				</div>
			</div>

			{verification && <VerificationStats verification={verification} />}
			{motionControlResult && <MotionControlStats motionControlResult={motionControlResult} />}

			<div className='stats-block'>
				<h3 className='stats-block__heading'>Bestshot Metrics</h3>
				{quality && <QualityStats quality={quality} />}
				{liveness && <LivenessStats liveness={liveness} />}
				{deepfake && <DeepfakeStats deepfake={deepfake} />}
			</div>
		</div>
	);
}

function VerificationStats({ verification }: VerificationMetrics) {
	return (
		<div className='stats-block'>
			<h3 className='stats-block__heading'>Verification Metrics</h3>

			<p className='stat-row'>
				<span className='bold'>The similarity:</span> {verification!.score}
			</p>

			<p className='stat-row'>
				<span className='bold'>Distance:</span> {verification!.distance}
			</p>

			<p className='stat-row'>
				<span className='bold'>FAR:</span> {verification!.fa_r}
			</p>

			<p className='stat-row'>
				<span className='bold'>FRR:</span> {verification!.fr_r}
			</p>
		</div>
	);
}

function QualityStats({ quality }: QualityMetrics) {
	return (
		<div className='bestshot-stats'>
			<h4 className='bestshot-stats__heading'>Quality Metrics</h4>
			<p className='stat-row'>
				<span className='bold'>Score:</span> {quality.total_score.toString()}
			</p>
		</div>
	);
}

function LivenessStats({ liveness }: LivenesMetrics) {
	return (
		<div className='bestshot-stats'>
			<h4 className='bestshot-stats__heading'>Liveness Metrics</h4>
			<p className='stat-row'>
				<span className='bold'>Value:</span> {liveness.value}
			</p>
			<p className='stat-row'>
				<span className='bold'>Confidence:</span> {liveness.confidence}
			</p>
			<p className='stat-row'>
				<span className='bold'>Attack type:</span> {liveness.attack_type}
			</p>

			<div className='bestshots__liveness-attacks-stats'>
				{Object.entries(liveness.attack_type_scores).map(([key, value]) => (
					<p
						key={key}
						className='stat-row'
					>
						<span className='bold'>{key}:</span> {value}
					</p>
				))}
			</div>
		</div>
	);
}

function DeepfakeStats({ deepfake }: DeepfakeMetrics) {
	return (
		<div className='bestshot-stats'>
			<h4 className='bestshot-stats__heading'>Deepfake Metrics</h4>

			<p className='stat-row'>
				<span className='bold'>Confidence:</span> {deepfake.confidence}
			</p>
		</div>
	);
}

function MotionControlStats({ motionControlResult }: MotionControlResult) {
	return (
		<div className='stats-block'>
			<h3 className='stats-block__heading'>Motion Control</h3>

			{motionControlResult?.map((item, index) => (
				<p
					className='stat-row'
					key={`${item.pattern}_${item.result.toString()}_${index}`}
				>
					{item.pattern}: {item.result.toString()}
				</p>
			))}
		</div>
	);
}
