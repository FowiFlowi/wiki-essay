const http = require('http'),
	express = require('express'),
	wiki = require('wikijs').default,
	generateDocx = require('generate-docx'),

	logger = require('./logger'),
	app = express(),
	server = http.createServer(app),
	PORT = process.env.PORT || 8000


app.set('view engine', 'jade')

app.use((req, res, next) => {
	logger.info(req.method, req.url)
	next()
})

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => res.status(200).redirect('/home'))
app.get('/home', (req, res) => res.render('index'))

app.get('/search', (req, res) => {
		wiki({ apiUrl: 'http://ru.wikipedia.org/w/api.php' }).search(req.query.topic, 10)
			.then(data => {
				if (data.results[0])
					res.render('list', {
						array: data.results,
						text: 'Выбирай что по вкусу, и через пару секунд мы сделаем тебе доклад '
					})
				else
					res.render('list', {
						array: data.results,
						text: 'Котя, по твоей теме мы ничего не нашли. Попробуй еще раз '
					})
			})
			.catch(e => logger.error(e))
})

app.get('/essay', (request, response) => {
	let title = request.query.name,
		options = {
			template: {
				filePath: './template.docx',
				data: {
					title,
					description: 'Доклад студента КПИ',
					body: ''
				}
			},
			save: { filePath: './essay.docx' }
		}

	wiki({ apiUrl: 'http://ru.wikipedia.org/w/api.php' }).page(title)
		.then(page => page.content())
		.then(res => {
			let m = res.match('== См. также ==')
			if (m) res = res.slice(0, m.index)
			m = res.match('== Примечания ==')
			if (m) res = res.slice(0, m.index)
			res = res.replace(/={3,} /g, '== == ')
			res = res.replace(/ ={3,}/g, ' == ==')

			options.template.data.body = res + '\n\n                  created by fowi with <3'
			generateDocx(options, (err, msg) => err ? logger.error(err) : response.download('./essay.docx'))
		})
		.catch(e => logger.error(e))
})



app.use((req, res, next) => {
	throw new Error('not found')
})

app.use((err, req, res, next) => {
	if (~err.message.indexOf('not found'))
		res.status(404).send('not found 404')
	else {
		logger.error(err)
		res.status(500).send('oops, something has broken :c\nerror 500')
	}
})


server.listen(PORT, () => logger.info('Server is running on port ' + PORT))