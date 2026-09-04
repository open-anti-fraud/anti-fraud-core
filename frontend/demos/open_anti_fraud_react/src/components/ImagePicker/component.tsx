import { HiddenInputFile } from '../../bricks';
import { useInputFile, type useInputFileProps } from '../../hooks';
import './style.css';

export default function ImagePicker(props: useInputFileProps) {
    const { inputRef, handleClick, handleChangeEvent, inputAccept } = useInputFile(props);

    return (
        <>
            <HiddenInputFile ref={inputRef} accept={inputAccept} onChange={handleChangeEvent} />
            <button className="image-picker" onClick={handleClick}>
                <p className="image-picker__action-text">Select image</p>
                <p className="image-picker__mime-type-hints">Acceptable image types: png, jpeg, jpg.</p>
            </button>
        </>
    );
}
