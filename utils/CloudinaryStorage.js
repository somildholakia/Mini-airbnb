"use strict";

class CloudinaryStorage {
  constructor({ cloudinary, params = {} } = {}) {
    if (!cloudinary?.uploader?.upload_stream || !cloudinary?.uploader?.destroy) {
      throw new TypeError("CloudinaryStorage requires a configured Cloudinary uploader.");
    }

    this.cloudinary = cloudinary;
    this.params = { ...params };
  }

  _handleFile(_req, file, callback) {
    let completed = false;
    let uploadStream;

    const finish = (error, info) => {
      if (completed) return;
      completed = true;
      callback(error, info);
    };

    try {
      uploadStream = this.cloudinary.uploader.upload_stream(this.params, (error, result) => {
        if (error) return finish(error);
        if (!result?.secure_url || !result?.public_id) {
          return finish(new Error("Cloudinary returned an incomplete image upload result."));
        }

        finish(null, {
          path: result.secure_url,
          filename: result.public_id,
          public_id: result.public_id,
          secure_url: result.secure_url,
          size: result.bytes,
          format: result.format,
          width: result.width,
          height: result.height
        });
      });

      uploadStream.once("error", finish);
      file.stream.once("error", (error) => {
        if (!uploadStream.destroyed) uploadStream.destroy(error);
        finish(error);
      });
      file.stream.pipe(uploadStream);
    } catch (error) {
      if (uploadStream && !uploadStream.destroyed) uploadStream.destroy();
      finish(error);
    }
  }

  _removeFile(_req, file, callback) {
    if (!file?.filename) return callback(null);

    this.cloudinary.uploader.destroy(
      file.filename,
      { resource_type: "image" },
      (error) => callback(error || null)
    );
  }
}

module.exports = CloudinaryStorage;
