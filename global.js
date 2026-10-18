
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'resume/', title: 'Resume' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/jkampen-ucsd', title: 'GitHub' }
];

const BASE_PATH = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
)
    ? '/'
    : '/website/';

let nav = document.createElement('nav');

document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!url.startsWith('http')) {
        url = BASE_PATH + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if (
        a.host === location.host &&
        a.pathname.replace(/index\.html$/, '').replace(/\/$/, '') ===
        location.pathname.replace(/index\.html$/, '').replace(/\/$/, '')
    ) {
        a.classList.add('current');
    }

    if (a.host !== location.host) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
		</select>
	</label>`,
);

let select = document.querySelector('.color-scheme select');

if ('colorScheme' in localStorage) {
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

select.addEventListener('input', function (event) {
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
    select.value = localStorage.colorScheme;
});

let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
    event.preventDefault();

    let data = new FormData(form);

    let url = form.action + '?';

    for (let [name, value] of data) {
        let encodedValue = encodeURIComponent(value);
        url += `${name}=${encodedValue}&`;
    }

    url = url.slice(0, -1);
    location.href = url;
});