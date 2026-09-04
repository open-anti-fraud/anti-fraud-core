if (!self.MediaStreamTrackProcessor) {
    self.MediaStreamTrackProcessor = class MediaStreamTrackProcessor {
        constructor({ track }) {
            if (track.kind === 'video') {
                this.readable = new ReadableStream({
                    start: async (controller) => {
                        this.video = document.createElement('video');
                        this.video.srcObject = new MediaStream([track]);
                        this.video.muted = true;
                        await this.video.play().catch(() => {});

                        await new Promise((r) => {
                            if (this.video.readyState >= 2) r();
                            else this.video.onloadedmetadata = r;
                        });

                        this.track = track;
                        this.canvas = new OffscreenCanvas(this.video.videoWidth, this.video.videoHeight);
                        this.ctx = this.canvas.getContext('2d', {
                            desynchronized: true,
                        });
                        this.t1 = performance.now();


                        this.track.addEventListener('ended', () => {
                            controller.close();
                            this.cleanup();
                        });
                    },

                    pull: async (controller) => {
                        if (this.track.readyState === 'ended') {
                            this.cleanup();
                            controller.close();
                            return;
                        }

                        while (performance.now() - this.t1 < 1000 / (this.track.getSettings().frameRate || 30)) {
                            await new Promise((r) => requestAnimationFrame(r));
                        }
                        this.t1 = performance.now();

                        this.ctx.drawImage(this.video, 0, 0);
                        const frame = new VideoFrame(this.canvas, {
                            timestamp: this.t1 * 1000,
                        });
                        controller.enqueue(frame);
                    },

                    cancel: () => this.cleanup(),
                });
            }
        }

        cleanup() {
            if (this.video) {
                this.video.pause();
                this.video.srcObject = null;
                this.video = null;
            }
            if (this.canvas) {
                this.ctx = null;
                this.canvas = null;
            }
        }
    };
}
