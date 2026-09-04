import { HtmlElementsSearcher, MediaStreamIsUndefinedError, UiKit } from '../../shared';
import {
    ArrowsMotionControlDirectionHints,
    Button,
    CameraPreview,
    cameraPreviewFactory,
    CameraSelector,
    ContentLayout,
    DescriptionHeading,
    DescriptionText,
    EllipseFaceBorder,
    ErrorScreenLayout,
    FaceBorder,
    FaceKeypointsMask,
    IdentifyApplicantForm,
    MotionControlDirectionHints,
    MotionControlImagesHints,
    PageHeading,
    PageLayout,
    Preloader,
    RelativeContainer,
    SessionIdHint,
    TextHints,
    ValidationFlowVerdict,
} from '../../ui';

export default class View {
    private _htmlContainer: HTMLElement;

    private _page: PageLayout;
    private _preloader: Preloader;
    private _errorScreenLayout: ErrorScreenLayout;
    private _pageHeading: PageHeading;

    public identifyApplicantForm: IdentifyApplicantForm;
    public continueButton: Button;
    public backButton: Button | undefined;
    public tryAgainButton: Button | undefined;

    public contentLayout: ContentLayout;
    public relativeContainer: RelativeContainer;

    public cameraSelector: CameraSelector;
    public cameraPreview: CameraPreview;
    public textHints: TextHints;
    public preloader: Preloader;

    public descriptionHeading: DescriptionHeading;
    public descriptionText: DescriptionText;

    public faceKeypointMask: FaceKeypointsMask;
    public faceBorder: FaceBorder;

    public directionArrowHint: MotionControlDirectionHints;
    public directionGifHint: MotionControlImagesHints;

    public validationFlowVerdict: ValidationFlowVerdict;
    public sessionIdHint: SessionIdHint;

    public readonly rootStyles = getComputedStyle(document.documentElement);
    public readonly successBorderColor = this.rootStyles.getPropertyValue('--success-color').trim() ?? '#90ee90';
    public readonly errorBorderColor = this.rootStyles.getPropertyValue('--error-color').trim() ?? '#ff0000';

    constructor(
        htmlContainerId: string | undefined,
        uiKit: UiKit | undefined,
        disabledComponents: Set<string> = new Set()
    ) {
        this._createPage(htmlContainerId);

        this._pageHeading = new PageHeading();
        this._page.header.append(this._pageHeading.root);

        this.sessionIdHint = new SessionIdHint();
        this._page.root.append(this.sessionIdHint.root);

        this._preloader = new Preloader();
        this._errorScreenLayout = uiKit?.ErrorScreenLayout ? new uiKit.ErrorScreenLayout() : new ErrorScreenLayout();
        this.tryAgainButton = new Button();

        this.identifyApplicantForm = new IdentifyApplicantForm([]);
        this.continueButton = new Button();
        this.backButton = disabledComponents.has('backButton') ? undefined : new Button();

        this.contentLayout = new ContentLayout();
        this.relativeContainer = new RelativeContainer();

        this.cameraSelector = new CameraSelector();
        this.preloader = new Preloader();
        this.cameraPreview = cameraPreviewFactory();
        this.textHints = new TextHints();

        this.descriptionHeading = new DescriptionHeading();
        this.descriptionText = new DescriptionText();

        this.faceKeypointMask = uiKit?.FaceKeypointsMask ? new uiKit.FaceKeypointsMask() : new FaceKeypointsMask();
        this.faceBorder = uiKit?.FaceBorder ? new uiKit.FaceBorder() : new EllipseFaceBorder();

        this.directionArrowHint = uiKit?.MotionControlDirectionHints
            ? new uiKit.MotionControlDirectionHints()
            : new ArrowsMotionControlDirectionHints();
        this.directionGifHint = new MotionControlImagesHints();

        this.validationFlowVerdict = new ValidationFlowVerdict();

        this.setContent(this.contentLayout.root);
    }

    private _createPage(htmlContainerId?: string) {
        this._htmlContainer = HtmlElementsSearcher.getElementById(htmlContainerId);
        this._page = new PageLayout();
        this._renderPageLayout();
    }

    private _renderPageLayout() {
        this._htmlContainer.append(this._page.root);
    }

    public setHeading(text?: string) {
        this._pageHeading.setText(text);
    }

    public setContent(element: HTMLElement) {
        this._page.content.append(element);
    }

    public setFooter(element: HTMLElement) {
        this._page.footer.append(element);
    }

    public setPreloader(message?: string) {
        this._preloader.setMessage(message);
        this._renderPreloader();
    }

    private _renderPreloader() {
        if (!this._preloader?.root?.parentNode) this._page.root.append(this._preloader.root);
    }

    public removePreloader() {
        if (this._preloader?.root?.parentNode) this._preloader.root.remove();
    }

    public setTryAgainButtonText(text?: string) {
        this.tryAgainButton?.setText(text);
    }

    public onClickTryAgainButton(fn: () => void) {
        this.tryAgainButton?.setHandleClick(fn);
    }

    public showError(text: string) {
        this._errorScreenLayout.setErrorMessage(text);
        this._page.content.append(this._errorScreenLayout.root);
    }

    public showTryAgainButton() {
        if (this.tryAgainButton?.root) this._page.footer.append(this.tryAgainButton.root);
    }

    public removeErrorScreen() {
        this._errorScreenLayout.root.remove();
        if (this.tryAgainButton?.root?.parentNode) this.tryAgainButton.root.remove();

        this._page.root.append(this._page.header);
        this._page.root.append(this._page.content);
        this._page.root.append(this._page.footer);
    }

    public renderContentLayout() {
        this.contentLayout.content.append(this.relativeContainer.root);
    }

    public async renderCameraPreview(stream: MediaStream | undefined) {
        if (!stream) throw new MediaStreamIsUndefinedError();

        try {
            this.contentLayout.content.append(this.preloader.root);
            this.cameraPreview.setVideoSource(stream);
            await this.cameraPreview.play();
            this.relativeContainer.root.append(this.cameraPreview.root);
        } catch (err) {
            throw err;
        } finally {
            this.preloader.root.remove();
        }
    }

    public renderTextHints() {
        this.contentLayout.footer.append(this.textHints.root);
    }

    public updateCanvasResolution() {
        const { width: previewWidth, height: previewHeight } = this.cameraPreview!.getPreviewResolution();
        this.faceKeypointMask.setResolution(previewWidth, previewHeight);
        this.directionArrowHint.setResolution(previewWidth, previewHeight);
        this.faceBorder.setResolution(previewWidth, previewHeight);
    }

    public renderFaceKeypointMask() {
        this.relativeContainer.root.append(this.faceKeypointMask.root);
    }

    public renderDirectionHints() {
        this.relativeContainer.root.append(this.directionArrowHint.root);
    }

    public renderFaceBorder() {
        this.relativeContainer.root.append(this.faceBorder.root);
    }

    public resetHighlightFaceBorder() {
        this.faceBorder.setContextOption(this.faceBorder.initialOptions);
    }

    public highlightFaceBorder(type: 'success' | 'failed') {
        this.faceBorder.setContextOption({
            ...this.faceBorder.initialOptions,
            strokeStyle: type === 'success' ? this.successBorderColor : this.errorBorderColor,
        });
    }

    destroy() {
        this.sessionIdHint?.destroy();
        this.identifyApplicantForm?.destroy();
        this.continueButton?.destroy();
        this.backButton?.destroy();
        this.tryAgainButton?.destroy();

        this.descriptionHeading?.destroy();
        this.descriptionText?.destroy();

        this.relativeContainer?.destroy();
        this.cameraSelector?.destroy();
        this.cameraPreview?.destroy();
        this.textHints?.destroy();
        this.contentLayout?.destroy();
        this.faceKeypointMask?.destroy();
        this.directionArrowHint?.destroy();
        this.directionGifHint?.destroy();

        this.validationFlowVerdict?.destroy();

        this._preloader.destroy();
        this._pageHeading.destroy();
        this._errorScreenLayout.destroy();
        this._page.destroy();

        this.sessionIdHint = undefined!;
        this.identifyApplicantForm = undefined!;
        this.continueButton = undefined!;
        this.backButton = undefined!;
        this.tryAgainButton = undefined!;

        this.descriptionHeading = undefined!;
        this.descriptionText = undefined!;

        this.relativeContainer = undefined!;
        this.cameraSelector = undefined!;
        this.cameraPreview = undefined!;
        this.textHints = undefined!;
        this.contentLayout = undefined!;
        this.faceKeypointMask = undefined!;
        this.directionArrowHint = undefined!;
        this.directionGifHint = undefined!;

        this.validationFlowVerdict = undefined!;

        this._preloader = undefined!;
        this._pageHeading = undefined!;
        this._errorScreenLayout = undefined!;
        this._page = undefined!;
    }
}
