import './style.css';

export type Props = Partial<{
	text: string;
	type: 'filled' | 'outline';
	handleClick: (
		event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => void;
}>;

const defaultProps: Props = {
	type: 'filled',
	text: 'Button Text',
	handleClick: () => {
		throw new Error('Not implemented');
	},
};

export default function Button({
	type = defaultProps.type,
	text = defaultProps.type,
	handleClick = defaultProps.handleClick,
}: Props) {
	const classNames = ['button', `button_${type}`];

	return (
		<button
			className={classNames.join(' ')}
			onClick={handleClick}
		>
			{text}
		</button>
	);
}
