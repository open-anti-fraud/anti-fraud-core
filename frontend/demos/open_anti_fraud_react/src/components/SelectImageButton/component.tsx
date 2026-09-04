import { HiddenInputFile } from '../../bricks';
import { Button, type ButtonProps } from '../../bricks/buttons';
import { useInputFile, type useInputFileProps } from '../../hooks';

import './style.css';

type Props = useInputFileProps & ButtonProps;

export default function SelectImageButton(props: Props) {
	const { inputRef, handleClick, handleChangeEvent, inputAccept } =
		useInputFile(props);

	return (
		<>
			<HiddenInputFile
				ref={inputRef}
				accept={inputAccept}
				onChange={handleChangeEvent}
			/>

			<Button
				text='Select other image'
				handleClick={handleClick}
				type={props.type}
			/>
		</>
	);
}
