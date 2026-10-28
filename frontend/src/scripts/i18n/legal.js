// The terms, privacy and copyright pages (pages/legal.js), in English only, whatever the
// site's language. [text](/path) is a link.
const legal = {
    updated: 'Last updated 27 October 2026',
    terms: {
        title: 'Terms',
        lead: 'The rules for using Bookflow. They are short, and meant to be read.',
        sections: [
            {
                heading: 'Using Bookflow',
                text: [
                    'Bookflow is a free website run by Andria Beridze. By using it you agree to these terms. If you don’t, please don’t use the site.',
                ],
            },
            {
                heading: 'The PDFs you convert',
                text: [
                    'Only upload PDFs you have the right to convert, such as books in the public domain or your own copies for your own reading. You keep every right you have to them.',
                    'A PDF is used only to make your EPUB, and is deleted once you leave its page, as the [privacy page](/privacy) says. Converting a book doesn’t make it yours to share.',
                ],
            },
            {
                heading: 'The library',
                text: [
                    'The library holds books that are in the public domain or shared with permission. Each book’s copyright stays with whoever holds it. Download them for your own reading unless the book is in the public domain.',
                ],
            },
            {
                heading: 'What you send us',
                text: [
                    'When you suggest a book with its PDF, you confirm that what you said about its rights is true. We may add the book to the library, or not.',
                ],
            },
            {
                heading: 'What not to do',
                text: [
                    'Don’t use Bookflow to break the law or anyone’s rights, upload harmful files, get around the limits on uploads and forms, or put more load on the site than a person reading would.',
                ],
            },
            {
                heading: 'No guarantees',
                text: [
                    'Bookflow is offered as it is. Conversions can have mistakes, so check a book before relying on it. The site may change, pause or stop. As far as the law allows, we aren’t responsible for losses that come from using it.',
                ],
            },
            {
                heading: 'The code',
                text: [
                    'Bookflow’s code is free software under the GNU AGPL, version 3 or later. That license, not these terms, says what you may do with the code. See the [copyright page](/copyright).',
                ],
            },
            {
                heading: 'Changes and questions',
                text: [
                    'If these terms change, the date above changes with them. Questions go through the [contact page](/contact).',
                ],
            },
        ],
    },
    privacy: {
        title: 'Privacy',
        lead: 'What Bookflow keeps about you, why, and for how long. As little as it can.',
        sections: [
            {
                heading: 'Who we are',
                text: [
                    'Bookflow is run by Andria Beridze. Write through the [contact page](/contact) or to andria24b@gmail.com about anything on this page.',
                ],
            },
            {
                heading: 'PDFs you convert',
                text: [
                    'The PDF you upload, and the book read from it, are kept on the server only while its page is open. They are deleted about a minute after you leave, or within 15 minutes if the page closes without saying so. They aren’t added to the library or shared with anyone.',
                ],
            },
            {
                heading: 'What you send us',
                text: [
                    'A message or suggestion keeps what you wrote, the name and email you gave, the PDF if you attached one, and the site’s language at the time. It is used only to answer you, to consider the book, and to tell you if the book is added. It is kept until we delete it, and we will when you ask.',
                    'A copy of each one arrives by email, through Gmail, so Google handles it too.',
                ],
            },
            {
                heading: 'Your address',
                text: [
                    'Your IP address is used to limit how often one visitor can upload or send a form. It is kept in the server’s memory for an hour for that.',
                    'Like most web servers, ours logs each request: the address, the page, the time and the browser. The logs are kept for a short time, to keep the site running and safe, and then deleted.',
                ],
            },
            {
                heading: 'Cookies and storage',
                text: [
                    'One cookie, csrftoken, protects the forms from being sent by other sites. Your language and theme are kept in your browser’s local storage, and never leave it. There is no analytics, advertising or tracking.',
                ],
            },
            {
                heading: 'Other services',
                text: [
                    'The site’s fonts come from Google Fonts, so your browser asks Google for them, and Google sees your address. See [Google Fonts’ privacy answers](https://developers.google.com/fonts/faq/privacy).',
                ],
            },
            {
                heading: 'Your rights',
                text: [
                    'You can ask what we hold about you, and have it corrected or deleted, through the [contact page](/contact).',
                ],
            },
            {
                heading: 'Changes',
                text: [
                    'If this page changes, the date above changes with it.',
                ],
            },
        ],
    },
    copyright: {
        title: 'Copyright',
        lead: 'Who owns what on Bookflow, and what to do if your work is here without permission.',
        sections: [
            {
                heading: 'The site',
                text: [
                    '© 2026 Andria Beridze. Bookflow is free software under the GNU AGPL, version 3 or later. Its source, at the exact version running here, is linked in the footer as “Source code”.',
                    'Anything built on Bookflow must show its users this credit: Based on Bookflow by Andria Beridze (https://github.com/andriaberi/Bookflow). See the [NOTICE](https://github.com/andriaberi/Bookflow/blob/main/NOTICE).',
                ],
            },
            {
                heading: 'The books',
                text: [
                    'Every book keeps its own copyright, held by its author, translator or publisher. The library holds only books in the public domain or shared with permission.',
                ],
            },
            {
                heading: 'If your work is here without permission',
                text: [
                    'Tell us through the [contact page](/contact?kind=copyright): which book, who you are, and that you hold its rights or act for whoever does. We take the book down while we look into it, and answer you by email.',
                ],
            },
            {
                heading: 'What Bookflow uses',
                text: [
                    'Uses PDF2EPUB by Andria Beridze ([github.com/andriaberi/PDF2EPUB](https://github.com/andriaberi/PDF2EPUB)), under the GNU AGPL, version 3 or later.',
                    'The fonts are under the SIL Open Font License: Inter, Bricolage Grotesque and Noto on the site, and Noto in the EPUBs.',
                ],
            },
        ],
    },
};

export default legal;
