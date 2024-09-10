const {
  default: makeWASocket,
  downloadContentFromMessage,
  prepareWAMessageMedia,
  generateWAMessageFromContent
} = require('@whiskeysockets/baileys');
const mime = require('mime-types');
const fs = require('fs').promises;
const { join } = require('path');
const { default: axios } = require('axios');

function formatReceipt(phoneNumber) {
  try {
    if (phoneNumber.endsWith('@g.us')) {
      return phoneNumber;
    }
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber += '@c.us';
    }
    return formattedNumber;
  } catch (error) {
    console.error('Error formatting receipt:', error);
    return phoneNumber;
  }
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function removeForbiddenCharacters(inputString) {
  return inputString.replace(/[\x00-\x1F\x7F-\x9F'\\"]/g, '');
}

async function parseIncomingMessage(incomingMessage) {
  const messageType = Object.keys(incomingMessage.message || {})[0];
  const messageContent = (() => {
    switch (messageType) {
      case 'conversation':
        return incomingMessage.message.conversation;
      case 'imageMessage':
        return incomingMessage.message.imageMessage.caption;
      case 'videoMessage':
        return incomingMessage.message.videoMessage.caption;
      case 'extendedTextMessage':
        return incomingMessage.message.extendedTextMessage.text;
      case 'messageContextInfo':
        return (
          incomingMessage.message.listResponseMessage?.title || incomingMessage.message.buttonsResponseMessage?.selectedDisplayText || ''
        );
      default:
        return '';
    }
  })();

  const sanitizedContent = await removeForbiddenCharacters(messageContent.toLowerCase());
  const senderNumber = incomingMessage.key.remoteJid.split('@')[0];

  let imageBuffer = null;
  if (messageType === 'imageMessage') {
    const imageStream = await downloadContentFromMessage(incomingMessage.message.imageMessage, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of imageStream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    imageBuffer = buffer.toString('base64');
  }

  return {
    command: sanitizedContent,
    bufferImage: imageBuffer,
    from: senderNumber
  };
}

function getSavedPhoneNumber(token) {
  return new Promise((resolve, reject) => {
    if (token) {
      setTimeout(() => {
        resolve(token);
      }, 2000);
    } else {
      reject(new Error('Nomor telepon tidak ditemukan.'));
    }
  });
}

const mimeCache = new Map();
let thumbnailCache = null;

const prepareMediaMessage = async (socket, mediaOptions) => {
  try {
    const { mediatype, media, caption, fileName } = mediaOptions;
    const messageKey = `${mediatype}Message`;

    console.time('Prepare Media');
    const preparedMediaPromise = prepareWAMessageMedia({ [mediatype]: { url: media } }, { upload: socket.waUploadToServer });
    console.timeEnd('Prepare Media');

    if (mediatype === 'document' && !fileName) {
      const fileNameMatch = /.*\/(.+?)\./.exec(media);
      mediaOptions.fileName = fileNameMatch ? fileNameMatch[1] : 'unknown';
    }

    console.time('MIME Type Lookup');
    let mimetype = mimeCache.get(media) || mime.lookup(media);
    if (!mimetype) {
      mimetype = await getMimeType(media);
      mimeCache.set(media, mimetype);
    }
    console.timeEnd('MIME Type Lookup');

    if (media.endsWith('.cdr')) {
      mimetype = 'application/cdr';
    }

    console.time('Thumbnail Load');
    const thumbnailPromise = mediatype === 'video' && !thumbnailCache ? loadThumbnail() : Promise.resolve(thumbnailCache);
    console.timeEnd('Thumbnail Load');

    console.time('Wait for Media and Thumbnail');
    const [preparedMedia, jpegThumbnail] = await Promise.all([preparedMediaPromise, thumbnailPromise]);
    console.timeEnd('Wait for Media and Thumbnail');

    preparedMedia[messageKey] = {
      ...preparedMedia[messageKey],
      caption,
      mimetype,
      fileName: mediaOptions.fileName
    };

    if (mediatype === 'video') {
      preparedMedia[messageKey].jpegThumbnail = jpegThumbnail;
      preparedMedia[messageKey].gifPlayback = false;
    }

    const userJid = socket.user.id.replace(/:\d+/, '');

    console.time('Generate WA Message');
    const result = await generateWAMessageFromContent('', { [messageKey]: preparedMedia[messageKey] }, { userJid });
    console.timeEnd('Generate WA Message');

    return result;
  } catch (error) {
    console.error('Error preparing media message:', error);
    return false;
  }
};

const getMimeType = async media => {
  try {
    console.time('MIME Type Network Request');
    const response = await axios.head(media);
    console.timeEnd('MIME Type Network Request');
    return response.headers['content-type'];
  } catch (error) {
    console.error('Error fetching MIME type:', error);
    return 'application/octet-stream';
  }
};

const loadThumbnail = async () => {
  if (thumbnailCache) return thumbnailCache;

  try {
    console.time('Thumbnail File Read');
    const thumbnailPath = join(process.cwd(), 'public', 'images', 'video-cover.png');
    const buffer = await fs.readFile(thumbnailPath);
    console.timeEnd('Thumbnail File Read');
    thumbnailCache = Uint8Array.from(buffer);
    return thumbnailCache;
  } catch (error) {
    console.error('Error loading thumbnail:', error);
    return null;
  }
};

module.exports = {
  formatReceipt,
  asyncForEach,
  removeForbiddenCharacters,
  parseIncomingMessage,
  getSavedPhoneNumber,
  prepareMediaMessage
};
