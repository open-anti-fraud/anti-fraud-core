import { Button } from '../../bricks/buttons';
import './style.css';

type Props = {
	onLogin: () => void;
};

export default function LoginForm({ onLogin }: Props) {
	const login = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		onLogin();
	};

	return (
		<form className='login-form'>
			<h1 className='login-form__heading'>Log In</h1>

			<div className='login-fields'>
				<div className='login__field'>
					<label
						htmlFor='E-mail'
						className='login__label'
					>
						E-mail
					</label>
					<input
						name='E-mail'
						className='login__input'
						type='email'
						placeholder='example@mail.com'
						required
					></input>
				</div>

				<div className='login__field'>
					<label
						htmlFor='password'
						className='login__label'
					>
						Password
					</label>
					<input
						name='password'
						className='login__input'
						type='password'
						placeholder='Enter password'
						required
					></input>
				</div>
			</div>

			<Button
				text={'Login'}
				handleClick={login}
			/>
		</form>
	);
}
