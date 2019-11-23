const pObj = pico.export('pico/obj')
const tree = document.getElementsByTagName('ul')[0]
const editor = document.getElementById('editor')
const preview = document.getElementsByTagName('iframe')[0]
const refresh = document.getElementById('refresh')
const workspace = document.getElementById('workspace')
const save = document.getElementById('save')
let proj
let fsHdl

async function projOpen(hdl, proj){
	const entries = await hdl.getEntries()
	for await (let entry of entries){
		if (entry.isFile){
			proj[entry.name] = [entry]		
		}else{
			proj[entry.name] = await projOpen(await hdl.getDirectory(entry.name), {})
		}
	}
	return proj
}

function projRender(host, proj){
	let html = []
	for (let key in proj){
		if (Array.isArray(proj[key])){
			html.push('<li>', host + '/' + key, '</li>')
		}else{
			html.push(...projRender(host + '/' + key, proj[key]))
		}
	}
	return html
}

if (!window.chooseFileSystemEntries){
	workspace.classList.add('hide')
}

tree.addEventListener('click', async (e) => {
	if ('LI' !== e.target.tagName) return
	const arr = e.target.textContent.split('/')
	const [hdl, cache] = pObj.dot(proj, arr.slice(1))
	editor.dataset.fname = e.target.textContent
	if (cache){
		editor.value = cache
	}else if (hdl){
		const file = await hdl.getFile();
		editor.value = await file.text();
	}
})

refresh.addEventListener('click', () => {
	const content = preview.contentWindow.document
	const head = content.getElementsByTagName('head')[0]
	head.innerHTML = '<style>' + cssTA.value + '</style>'
	const body = content.getElementsByTagName('body')[0]
	body.innerHTML = htmlTA.value

	const g = content.createElement('script')
	g.text = jsTA.value
	body.appendChild(g)
})

workspace.addEventListener('click', async () => {
	fsHdl = await window.chooseFileSystemEntries({type: 'openDirectory'})
	if (!fsHdl) return alert('read dir failed')
	proj = await projOpen(fsHdl, {})
	tree.innerHTML = projRender('.', proj).join('')
})

// dun put break point here!! it will cause Not Allow Error
save.addEventListener('click', async () => {
	const fname = editor.dataset.fname
	const arr = fname.split('/')
	const [hdl, cache] = pObj.dot(proj, arr.slice(1))
	if (!hdl) return alert('write file failed')
	// Create a writer (request permission if necessary).
	const writer = await hdl.createWriter()
	// Make sure we start with an empty file
	await writer.truncate(0);
	// Write the full length of the contents
	await writer.write(0, editor.value);
	// Close the file and write the contents to disk
	await writer.close();
})
