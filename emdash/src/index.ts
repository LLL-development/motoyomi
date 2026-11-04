import type {PluginDescriptor} from 'emdash';
const descriptor:PluginDescriptor={
 id:'motoyomi',version:'1.0.0',format:'standard',entrypoint:'@motoyomi/emdash/sandbox',capabilities:['content:read','schema:read'],allowedHosts:[],
 storage:{docs:{indexes:['collection','updated_at']}},
 hooks:['plugin:install','plugin:activate','plugin:uninstall','cron',...['content:afterPublish','content:afterSave','content:afterUnpublish','content:afterDelete'].map(name=>({name,errorPolicy:'continue' as const}))],
 routes:[{name:'admin',permission:'plugins:manage'},{name:'related',permission:'content:edit_own_drafts'}],
 adminPages:[{path:'/internal-links',label:'内部リンク',icon:'link'}],
 editorPanels:[{id:'related',title:'関連記事と内部リンク',route:'related'}]
};
export default Object.freeze(descriptor);
