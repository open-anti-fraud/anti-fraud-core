import './style.css';

type Props = { message: string };

export default function ErrorMessage({ message }: Props) {
	return (
		<div className='error-block'>
			<p>{message}</p>
		</div>
	);
}
