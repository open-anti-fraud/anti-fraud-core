import { useCallback, useEffect } from 'react';
import './App.css';
import { Button } from './bricks/buttons';
import {
    OpenAntiFraudWebComponent,
    BiometryStats,
    ErrorMessage,
    ImagePicker,
    ImagePreview,
    SelectImageButton,
} from './components';
import { LoginForm } from './components/LoginForm';
import {
    useBiometryResult,
    useError,
    useLogin,
    useModal,
    useSelectFile,
} from './hooks';

const ACCEPTED_TYPES = ['png', 'jpeg', 'jpg'];

export default function App() {
	const { hasLogged, login, logout } = useLogin();

	return (
		<>
			<div className='page'>
				<header className='page__header'>
					<h1 className='page__title'>Cvartel Demo</h1>
				</header>

				<main className='page__content center-block'>
					<div className='column center-block'>
						{hasLogged ? (
							<>
								<BiometryStage />
								<div className='logout-button-position-wrapper'>
									<Button
										text='Logout'
										handleClick={logout}
										type='outline'
									/>
								</div>
							</>
						) : (
							<LoginForm onLogin={login} />
						)}
					</div>
				</main>
			</div>
		</>
	);
}

function BiometryStage() {
	const { isOpen, openModal, closeModal } = useModal();
	const { src, dataUrl, handleFile, resetFile } = useSelectFile();
	const { error, handleError, resetError } = useError();
	const {
		data: biometryResult,
		handleData: handleBiometryResult,
		bestshot,
		handleBestshot,
		reset: resetBiometryResult,
	} = useBiometryResult();

	useEffect(() => {
		return () => {
			resetFile();
			resetError();
			resetBiometryResult();
			closeModal();
		};
	}, []);

	const selectOtherImage = useCallback(
		(file: File) => {
			resetFile();
			resetError();
			resetBiometryResult();
			handleFile(file);
		},
		[handleFile, resetBiometryResult, resetError, resetFile],
	);

	const start = useCallback(() => {
        resetError();
		openModal();
	}, [openModal]);

	return (
		<>
			<div className='container center-block relative-block '>
				{error && <ErrorMessage message={error.message} />}

				{!dataUrl && !biometryResult && (
					<ImagePicker
						acceptedTypes={ACCEPTED_TYPES}
						handleError={handleError}
						handleSelectedFile={handleFile}
					/>
				)}

				{dataUrl && !biometryResult && <ImagePreview src={dataUrl} />}

				{biometryResult && (
					<BiometryStats
						originalPhoto={dataUrl}
						bestshot={bestshot}
						biometryResult={biometryResult}
					/>
				)}
			</div>

			{(error || biometryResult) && (
				<SelectImageButton
					acceptedTypes={ACCEPTED_TYPES}
					handleError={handleError}
					handleSelectedFile={selectOtherImage}
				/>
			)}

			{!error && src && !biometryResult && (
				<>
					<Button
						text={'Start biometry checks'}
						handleClick={start}
					/>
					<SelectImageButton
						acceptedTypes={ACCEPTED_TYPES}
						handleError={handleError}
						handleSelectedFile={selectOtherImage}
						type='outline'
					/>
				</>
			)}

			<div className="start-without-image-button-wrapper">
				<Button
					text={'Start biometry checks without image'}
					handleClick={start}
					type='outline'
				/>
			</div>

			{isOpen && (
				<OpenAntiFraudWebComponent
					blob={dataUrl}
					onClose={closeModal}
					onError={handleError}
					onValidate={handleBiometryResult}
					onBestshot={handleBestshot}
				/>
			)}
		</>
	);
}
