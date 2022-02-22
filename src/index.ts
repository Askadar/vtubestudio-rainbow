import main from './main'
import ui from './ui-server'

const urlDevelopment = `ws://192.168.64.1:8001`

main({ url: urlDevelopment })
ui()
