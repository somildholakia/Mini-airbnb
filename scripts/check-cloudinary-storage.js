const assert = require("node:assert/strict");
const { Readable, Writable } = require("node:stream");
const CloudinaryStorage = require("../utils/CloudinaryStorage");

async function testUploadAndRemove() {
  let uploadOptions;
  let destroyedAsset;

  const fakeCloudinary = {
    uploader: {
      upload_stream(options, callback) {
        uploadOptions = options;
        return new Writable({
          write(_chunk, _encoding, done) { done(); },
          final(done) {
            callback(null, {
              secure_url: "https://res.cloudinary.com/demo/image/upload/test.webp",
              public_id: "wandersSite_dev/test",
              bytes: 4,
              format: "webp",
              width: 20,
              height: 10
            });
            done();
          }
        });
      },
      destroy(publicId, options, callback) {
        destroyedAsset = { publicId, options };
        callback(null, { result: "ok" });
      }
    }
  };

  const storage = new CloudinaryStorage({
    cloudinary: fakeCloudinary,
    params: { folder: "wandersSite_dev", allowed_formats: ["jpg", "png", "webp"] }
  });

  const uploadedFile = await new Promise((resolve, reject) => {
    storage._handleFile({}, { stream: Readable.from([Buffer.from("test")]) }, (error, info) => {
      if (error) return reject(error);
      resolve(info);
    });
  });

  assert.equal(uploadOptions.folder, "wandersSite_dev");
  assert.equal(uploadedFile.path, "https://res.cloudinary.com/demo/image/upload/test.webp");
  assert.equal(uploadedFile.filename, "wandersSite_dev/test");
  assert.equal(uploadedFile.size, 4);
  assert.equal(uploadedFile.format, "webp");

  await new Promise((resolve, reject) => {
    storage._removeFile({}, uploadedFile, (error) => error ? reject(error) : resolve());
  });

  assert.equal(destroyedAsset.publicId, "wandersSite_dev/test");
  assert.equal(destroyedAsset.options.resource_type, "image");
}

testUploadAndRemove()
  .then(() => process.stdout.write("Validated Cloudinary upload and cleanup storage adapter.\n"))
  .catch((error) => {
    process.stderr.write(error.stack + "\n");
    process.exitCode = 1;
  });
