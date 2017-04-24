
import React, {Component} from 'react'
import {PagePickerDesktop} from './_new-page-picker'
import {PagePickerDataManager} from './helpers'
import {IconSelector} from './icons'
// import {tabs, tabs2} from './mocks'

import {global} from './_global'
const styles = global.styles
const greenscreen = styles.backgroundColor('green')
const floatLeft = styles.float()
const merge = styles.merge
const inlineBlock = styles.display('inline-block')

const ppdm = new PagePickerDataManager()

export class PagePickerInteractor extends Component {

    constructor(props){
      super()
      this.cached_ChildTabs;
      this.icon = IconSelector("arrow_bullet");
      this.PortalTabParamters = props.PortalTabParamters || null
      this.InitialTabsURL =     `http://auto.engage458.com/API/PersonaBar/Tabs/GetPortalTabs?portalId=0&cultureCode=&isMultiLanguage=false&excludeAdminTabs=true&disabledNotSelectable=false&roles=&sortOrder=0`
      this.DescendantTabsURL =  `http://auto.engage458.com/API/PersonaBar/Tabs/GetTabsDescendants?portalId=0&cultureCode=&isMultiLanguage=false&excludeAdminTabs=true&disabledNotSelectable=false&roles=&sortOrder=0`
      this.selectAll = false

    }

    componentWillMount(){
      this.setState({ tabs:[], selectAll:false, childrenSelected:true })
      this.init()
    }

    init(){
      this._requestInitialTabs()

    }

    _requestInitialTabs = () => {
       this._xhr(this.InitialTabsURL)
       .then(tabdata => this.PortalTabs = tabdata)
       .then( () => this.setState({tabs:this.PortalTabs, selectAll:this.state.selectAll}))
       .then( () => this.flatTabs = ppdm.flatten(this.PortalTabs) )
       .then( () => this.setState({tabs:this.PortalTabs}) )

       .catch(err => this.PortalTabs = this.tabs)
    }

    _requestDescendantTabs = (ParentTabId) => {
        let descendantTabs = null
        const params = `&parentId=${ParentTabId}`
        const mapToFlatTabs = (tabs) =>  tabs.map(tab => this.flatTabs[`${tab.TabId}-${tab.Name}`]=tab)
        const captureDecendants = (tabs) => descendantTabs=tabs.map(tab => {
          !Array.isArray(tab.ChildTabs) ? tab.ChildTabs=[] : null
          return tab
        })
        const input = (tabs) => compose(tabs, mapToFlatTabs, captureDecendants)
        const compose = (tabs, ...fns) => fns.forEach(fn => fn(tabs))
        const appendDescendants = (parentTab) => descendantTabs.forEach((tab)=> tab.ParentTabId==parentTab.TabId ? parentTab.ChildTabs.push(tab) : null )

        return this._xhr(this.DescendantTabsURL, params)
        .then( input )
        .then( ()=> this._traverseChildTabs(appendDescendants) )
        .then( ()=> this.setState({tabs:this.state.tabs}) )
    }

    _xhr(url, params='') {
      return new Promise((resolve, reject) => {
        var xhttp = new XMLHttpRequest();
        xhttp.onload = () => {
          const response = JSON.parse(xhttp.responseText).Results
          resolve(response)
        }
        xhttp.open("GET", url+params, true);
        xhttp.onerror = () => reject(xhttp)
        xhttp.send();
      })
    }

    _getRootTab(selection) {
      return Object.keys(selection)
      .map(key=> selection[key])
      .filter(tab => tab.TabId===-1&&tab.ParentTabId===0)
    }

    _generateSelectionObject(tab){
      return {
          "TabId": tab.TabId,
          "ParentTabId": tab.ParentTabId,
          "CheckedState": tab.CheckedState
      }
    }

    _filterOutUnchecked(tabs){
      return tabs.filter(tab => !!tab.CheckedState)
    }

    _filterChildrenOfAllSelected(tabs){
      const ParentTabIds = tabs.filter(tab=>tab.CheckedState==2).map(tab => tab.TabId)
      return tabs.filter(tab => ParentTabIds.indexOf(tab.ParentTabId)==-1)
    }

    _traverseChildTabs(comparator){
      let ChildTabs = this.state.tabs.ChildTabs
      const cached_childtabs = []
      cached_childtabs.push(ChildTabs)
      const condition  = (cached_childtabs.length > 0)
      const loop = () => {
        const childtab  = cached_childtabs.length ? cached_childtabs.shift() : null
        const left = () => childtab.forEach(tab => {
            Array.isArray(tab.ChildTabs) ? comparator(tab) : null
            Array.isArray(tab.ChildTabs) && tab.ChildTabs.length ? cached_childtabs.push(tab.ChildTabs) : null
            condition ? loop() : exit()
        })
        const right = () =>  null
        childtab ? left() : right()
      }

      const exit = () => null
      loop()
      return
    }


    _isAnyAllSelected(tabs){
      return tabs.filter(tab=>tab.CheckedState==2).length ? true : false
    }

    _mapSelection(selection, fn){
      const mapped = []
      for(let tab in selection){
        const obj = fn(selection[tab])
        mapped.push(obj)
      }
      return mapped
    }

    export = (selection) => {
      const RootTab = this._getRootTab(selection)
      const filterOutMasterRootTab = (tabs) => tabs.filter(tab=>tab.TabId!=-1)

      let tabs = this._mapSelection(selection, this._generateSelectionObject)
      tabs = this._filterOutUnchecked(tabs)
      tabs = filterOutMasterRootTab(tabs)

      const Left = () => {
          console.log(tabs)
      }

      const Right = () => {
        console.log(tabs)
      }
      this._isAnyAllSelected(tabs) ? Left() : Right()
    }

    setMasterRootCheckedState = () => {
      let totalChildren = 0
      let childrenSelected = 0
      const setLength = (tab) => !!tab?  totalChildren++ : null
      const isAllSelected = (tab) =>  tab.CheckedState ? childrenSelected++ : null

      this._traverseChildTabs(setLength)
      this._traverseChildTabs(isAllSelected)

      const left = () => this.setState({childrenSelected:true})
      const right = () => this.setState({childrenSelected:false})

      childrenSelected!=0 ? left() : right()
    }

    getChildTabs = (ParentTabId) => {
      return this._requestDescendantTabs(ParentTabId)
    }

    showChildTabs = (tabs) => {
      this.state.tabs.IsOpen =! this.state.tabs.IsOpen
      this.setState({tabs:this.state.tabs})
    }

    setCheckedState = () => {
      this.state.tabs.CheckedState = this.state.tabs.CheckedState ? 0 : 2
      this.state.selectAll = this.state.tabs.CheckedState ?  true : false
      this.setState({
          tabs:this.state.tabs,
          selectAll:this.state.selectAll
      })
      console.log('hmm', this.state.selectAll)
    }

    render_icon = (direction) => {
      const width = styles.width(100)
      const margin = styles.margin({top:-2})
      const animate = direction=='90deg' ? true : false
      const render = (
         <div style={merge(width, margin)}>
                <this.icon animate={true} reset={false} direction={direction} />
          </div>
        )
      return render
    }

    render_Bullet = (tab) => {
      const direction = this.state.tabs.IsOpen && this.state.tabs.ChildTabs.length ? '90deg' : '0deg'
      const render = this.render_icon(direction)
      return render
    }

    render_ListBullet = (tab, fn) => {
      const bullet = ( () => {
        const width = styles.width(20, 'px')
        const height = styles.height(20, 'px')

        return (
          <div
            onClick={()=>fn()}
            style={merge(floatLeft, width, height)}>
            { this.render_Bullet(tab) }
          </div>) })()
        return bullet
    }

    render_ListCheckbox = (tab) => {
      const checkbox =  ( () => {
        const padding = styles.padding({all:0})
        const checked = this.state.tabs.CheckedState
        return (
          <div style={merge(floatLeft, padding)}>
            <input
                type="checkbox"
                onChange={ (e)=>this.setCheckedState(this.state.tabs) }
                checked={this.state.tabs.CheckedState}
                />
          </div>) })()
      return checkbox
    }

    render_PagePicker = () => {
      const pagepicker = ( () => {
        const condition = (this.state.tabs.IsOpen && this.state.tabs.ChildTabs.length)
        const picker =  (
          <PagePickerDesktop
              icon_type="arrow_bullet"
              flatTabs={this.flatTabs}
              tabs={this.state.tabs.ChildTabs}
              export={this.export}
              getChildTabs={this.getChildTabs}
              setMasterRootCheckedState={this.setMasterRootCheckedState}
              rootContext={this}
          />)

        return (
          <div>
              { condition ? picker : null}
          </div>
        )

      } )()

      return pagepicker
    }

    render(){
      const listStyle = styles.listStyle()
      const textLeft = styles.textAlign('left')
      const ULPadding = styles.padding({all:3})
      const spanPadLeft = styles.padding({left:5})

      const checkbox = this.render_ListCheckbox(this.state.tabs)
      const bullet = this.render_ListBullet(this.state.tabs, (tab)=>this.showChildTabs(this.state.tabs) )
      const pagepicker = this.render_PagePicker()
       return (
          <ul style={merge(listStyle, ULPadding)}>
            <li style={merge(textLeft, ULPadding)}>
              {bullet}
              {checkbox}
              <span style={merge(spanPadLeft)}> {this.state.tabs.Name} </span>
              {this.state.childrenSelected ? <span>*</span> : <span></span>}
              {pagepicker}
            </li>
          </ul>
       )

    }
}
