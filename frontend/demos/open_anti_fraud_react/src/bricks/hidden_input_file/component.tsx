import './style.css';

type Props = {
    ref: React.RefObject<HTMLInputElement | null>;
    accept: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => void;
};

export default function HiddenInputFile({ ref, accept, onChange }: Props) {
    return (
        <input
            type="file"
            multiple={false}
            className="hidden-input-file"
            ref={ref}
            accept={accept}
            onChange={onChange}
        ></input>
    );
}
